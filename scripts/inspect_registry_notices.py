"""Read verified registry tar bytes in memory. Never extract or execute members."""
import gzip
import hashlib
import io
import json
import re
import sys
import tarfile

MAX_ARCHIVE = 64 * 1024 * 1024
MAX_EXPANDED = 256 * 1024 * 1024
MAX_NOTICE = 2 * 1024 * 1024
NOTICE = re.compile(r"^(?:licen[cs]e|copying|notice|copyright)(?:[._ -][a-z0-9._ -]{1,100})?$", re.I | re.ASCII)

def inspect_archive(data):
    if not 0 < len(data) <= MAX_ARCHIVE:
        raise ValueError("Archive size outside audit bounds")
    with gzip.GzipFile(fileobj=io.BytesIO(data)) as zipped:
        expanded = zipped.read(MAX_EXPANDED + 1)
    if len(expanded) > MAX_EXPANDED:
        raise ValueError("Expanded archive exceeds audit bound")
    notices, seen = [], set()
    skipped = nested = 0
    nested_files = []
    nested_skipped = 0
    metadata = None
    with tarfile.open(fileobj=io.BytesIO(expanded), mode="r:") as archive:
        for count, member in enumerate(archive, 1):
            if count > 100000:
                raise ValueError("Too many archive members")
            parts = member.name.split("/")
            if parts[0] != "package" or any(part in ("", ".", "..") or "\\" in part for part in parts):
                raise ValueError("Unexpected archive member path")
            if member.name in seen:
                raise ValueError("Duplicate archive member")
            seen.add(member.name)
            if len(parts) == 2 and parts[-1] == "package.json":
                if not member.isreg() or not 0 < member.size <= MAX_NOTICE:
                    raise ValueError("Invalid archive package metadata")
                metadata = json.loads(archive.extractfile(member).read())
            if len(parts) < 2 or not NOTICE.fullmatch(parts[-1]):
                continue
            if len(parts) > 2:
                nested += 1
                if nested > 1000:
                    raise ValueError("Too many nested notice candidates")
                relative = "/".join(parts[1:])
                if (not re.fullmatch(r"[A-Za-z0-9_.@+ /-]{1,240}", relative)
                        or not member.isreg() or not 0 < member.size <= MAX_NOTICE):
                    nested_skipped += 1
                    continue
                raw = archive.extractfile(member).read()
                if len(raw) != member.size:
                    raise ValueError("Nested notice size mismatch")
                nested_files.append({"archiveRelativePath": relative, "bytes": len(raw),
                                     "sha256": hashlib.sha256(raw).hexdigest()})
                continue
            if not member.isreg() or not 0 < member.size <= MAX_NOTICE:
                skipped += 1
                continue
            raw = archive.extractfile(member).read()
            if len(raw) != member.size:
                raise ValueError("Notice size mismatch")
            notices.append({"filename": parts[-1], "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()})
    if not isinstance(metadata, dict) or not isinstance(metadata.get("name"), str) or not isinstance(metadata.get("version"), str):
        raise ValueError("Missing archive identity")
    root_hashes = {(item["bytes"], item["sha256"]) for item in notices}
    for item in nested_files:
        item["matchesRootNoticeBytes"] = (item["bytes"], item["sha256"]) in root_hashes
    return {"name": metadata["name"], "version": metadata["version"],
            "noticeFiles": sorted(notices, key=lambda item: item["filename"]),
            "skippedNoticeCount": skipped, "nestedNoticeCount": nested,
            "nestedSkippedNoticeCount": nested_skipped,
            "nestedNoticeFiles": sorted(nested_files, key=lambda item: item["archiveRelativePath"])}

if __name__ == "__main__":
    try:
        print(json.dumps(inspect_archive(sys.stdin.buffer.read(MAX_ARCHIVE + 1))))
    except (ValueError, OSError, EOFError, tarfile.TarError):
        sys.exit("Registry archive notice inspection failed")
