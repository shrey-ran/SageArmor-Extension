import os
import re
import shutil
import subprocess
import tempfile
from urllib.parse import urlparse

IGNORED_DIRS = {
    '.git',
    'node_modules',
    'venv',
    '.venv',
    '__pycache__',
    'dist',
    'build',
    '.next',
    '.idea',
    '.vscode',
}

TEXT_FILE_EXTENSIONS = {
    '.py', '.js', '.ts', '.tsx', '.jsx', '.go', '.java', '.kt', '.rb', '.php', '.cs',
    '.tf', '.hcl', '.yaml', '.yml', '.json', '.toml', '.ini', '.cfg', '.conf',
    '.md', '.txt', '.sql', '.sh', '.ps1', '.dockerfile', '.gradle', '.xml', '.html', '.css',
}

SECURITY_KEYWORDS = [
    'auth', 'token', 'secret', 'password', 'jwt', 'session', 'sql', 'injection',
    's3', 'bucket', 'iam', 'policy', 'permission', 'encryption', 'cors', 'xss',
    'subprocess', 'exec', 'deserialize', 'admin', 'database', 'credential',
]

STOPWORDS = {
    'the', 'and', 'with', 'from', 'that', 'this', 'into', 'your', 'have', 'has',
    'for', 'not', 'are', 'was', 'were', 'will', 'would', 'should', 'can', 'could',
    'when', 'what', 'where', 'which', 'about', 'scan', 'repository', 'github',
}


def _run_cmd(args, cwd=None, env=None):
    return subprocess.run(
        args,
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


def _is_allowed_repo_url(repo_url):
    parsed = urlparse(repo_url)
    if parsed.scheme != 'https':
        return False
    return parsed.netloc.lower().endswith('github.com')


def _clone_repository(repo_url, target_dir, token=None, branch=None):
    if not _is_allowed_repo_url(repo_url):
        raise ValueError('Only https://github.com repositories are allowed')

    cmd = ['git']
    if token:
        cmd += ['-c', f'http.extraheader=Authorization: Bearer {token}']

    cmd += ['clone', '--depth', '1']
    if branch:
        cmd += ['--branch', branch, '--single-branch']
    cmd += [repo_url, target_dir]

    env = os.environ.copy()
    env['GIT_TERMINAL_PROMPT'] = '0'

    result = _run_cmd(cmd, env=env)
    if result.returncode != 0:
        raise RuntimeError(f'git clone failed: {result.stderr.strip() or result.stdout.strip()}')


def _is_text_candidate(file_name, size_bytes):
    if size_bytes > 1_000_000:
        return False

    lower_name = file_name.lower()
    if lower_name in {'dockerfile', 'makefile'}:
        return True

    _, ext = os.path.splitext(lower_name)
    return ext in TEXT_FILE_EXTENSIONS


def build_repo_map(repo_root, max_files=12000):
    files = []
    total_seen = 0

    for current_root, dirs, names in os.walk(repo_root):
        dirs[:] = [
            d for d in dirs
            if d not in IGNORED_DIRS and not d.startswith('.')
        ]

        for name in names:
            if name.startswith('.'):
                continue
            total_seen += 1
            abs_path = os.path.join(current_root, name)
            rel_path = os.path.relpath(abs_path, repo_root)

            try:
                size = os.path.getsize(abs_path)
            except OSError:
                continue

            if not _is_text_candidate(name, size):
                continue

            files.append(
                {
                    'path': rel_path,
                    'size_bytes': size,
                }
            )

            if len(files) >= max_files:
                return {
                    'files': files,
                    'total_seen': total_seen,
                    'truncated': True,
                }

    return {
        'files': files,
        'total_seen': total_seen,
        'truncated': False,
    }


def extract_keywords(text, max_keywords=14, include_security_defaults=True):
    raw_tokens = re.findall(r'[A-Za-z_][A-Za-z0-9_\-]{2,}', text or '')

    seen = set()
    keywords = []
    for token in raw_tokens:
        token_l = token.lower()
        if token_l in STOPWORDS:
            continue
        if token_l in seen:
            continue
        if len(token_l) < 3:
            continue
        seen.add(token_l)
        keywords.append(token_l)

    if include_security_defaults:
        for sec_kw in SECURITY_KEYWORDS:
            if sec_kw not in seen:
                keywords.append(sec_kw)

    return keywords[:max_keywords]


def _search_file_paths(repo_root, keywords):
    if not keywords:
        return []

    if shutil.which('rg'):
        cmd = ['rg', '-l', '-I']
        for kw in keywords:
            cmd += ['-e', kw]
        cmd += ['.']
        result = _run_cmd(cmd, cwd=repo_root)
    else:
        cmd = ['grep', '-rlI']
        for kw in keywords:
            cmd += ['-e', kw]
        cmd += ['.']
        result = _run_cmd(cmd, cwd=repo_root)

    if result.returncode not in (0, 1):
        return []

    matched = []
    for line in result.stdout.splitlines():
        path = line.strip()
        if not path:
            continue

        normalized = path[2:] if path.startswith('./') else path
        parts = normalized.split('/')
        if any(part in IGNORED_DIRS for part in parts):
            continue
        if any(part.startswith('.') for part in parts):
            continue
        matched.append(normalized)

    return sorted(set(matched))


def _score_and_select(repo_root, matched_paths, keywords, top_k=3, max_chars=4000):
    ranked = []
    for rel_path in matched_paths:
        abs_path = os.path.join(repo_root, rel_path)
        if not os.path.isfile(abs_path):
            continue

        try:
            with open(abs_path, 'r', encoding='utf-8', errors='ignore') as handle:
                excerpt = handle.read(max_chars)
        except OSError:
            continue

        text = excerpt.lower()
        hit_count = 0
        for kw in keywords:
            hit_count += len(re.findall(re.escape(kw), text))

        if hit_count <= 0:
            continue

        security_bonus = 0
        path_l = rel_path.lower()
        if any(k in path_l for k in ('auth', 'security', 'iam', 'policy', 'db', 'database', 'api', 'terraform', 'infra')):
            security_bonus = 2

        ranked.append(
            {
                'path': rel_path,
                'hit_count': hit_count + security_bonus,
                'excerpt': excerpt,
            }
        )

    ranked.sort(key=lambda item: item['hit_count'], reverse=True)
    return ranked[:top_k]


def selective_repo_scan(repo_url, query, token=None, branch=None, top_k=3):
    top_k = max(1, min(20, int(top_k)))

    with tempfile.TemporaryDirectory(prefix='sagearmor_repo_scan_') as tmp_dir:
        repo_dir = os.path.join(tmp_dir, 'repo')
        _clone_repository(repo_url, repo_dir, token=token, branch=branch)

        repo_map = build_repo_map(repo_dir)
        repo_files = repo_map['files']
        repo_file_set = {item['path'] for item in repo_files}

        query_keywords = extract_keywords(query, include_security_defaults=False)
        if query_keywords:
            keywords = query_keywords
        else:
            # Empty/weak query gets baseline security keywords.
            keywords = extract_keywords('', include_security_defaults=True)

        matched_paths = _search_file_paths(repo_dir, keywords)

        if repo_file_set:
            matched_paths = [p for p in matched_paths if p in repo_file_set]

        if not matched_paths and not query_keywords:
            matched_paths = [item['path'] for item in repo_files[: min(80, len(repo_files))]]

        selected = _score_and_select(repo_dir, matched_paths, keywords, top_k=top_k)

        return {
            'repo_stats': {
                'total_seen': repo_map['total_seen'],
                'text_candidates': len(repo_files),
                'matched_files': len(matched_paths),
                'selected_files': len(selected),
                'truncated_repo_map': repo_map['truncated'],
            },
            'keywords': keywords,
            'selected_files': selected,
        }
