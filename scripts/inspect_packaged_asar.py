"""Bounded read-only ASAR root-package notice inventory; never execute payload."""
import hashlib
import json
import re
import struct
import sys
from inspect_registry_notices import NOTICE

MAX_ASAR = 256 * 1024 * 1024
MAX_HEADER = 16 * 1024 * 1024
MAX_NOTICE = 2 * 1024 * 1024
NAME = re.compile(r"^(?:@[a-z0-9._-]+/)?[a-z0-9._-]+$", re.ASCII)
VERSION = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.+-]+)?$", re.ASCII)

def unique_object(items):
    result = {}
    for key, value in items:
        if key in result:
            raise ValueError("Duplicate ASAR JSON key")
        result[key] = value
    return result

def inspect_asar(data):
    if not 16 <= len(data) <= MAX_ASAR:
        raise ValueError("ASAR size outside audit bound")
    first, outer, inner, length = struct.unpack_from("<4I", data)
    if (first != 4 or not 0 < length <= MAX_HEADER or outer != inner + 4
            or inner != 4 + ((length + 3) // 4) * 4 or 8 + outer > len(data)):
        raise ValueError("Invalid ASAR header bounds")
    tree = json.loads(data[16:16 + length], object_pairs_hook=unique_object)
    start = 8 + outer
    def directory(node):
        if (not isinstance(node, dict) or "link" in node or node.get("unpacked")
                or not isinstance(node.get("files"), dict)):
            raise ValueError("Expected packed ASAR directory")
        return node["files"]
    def read_regular(node):
        if (not isinstance(node, dict) or "files" in node or "link" in node
                or node.get("unpacked") or type(node.get("size")) is not int
                or not 0 < node["size"] <= MAX_NOTICE
                or not isinstance(node.get("offset"), str)
                or not re.fullmatch(r"[0-9]{1,10}", node["offset"])):
            raise ValueError("Invalid or external ASAR notice/metadata")
        offset = start + int(node["offset"])
        end = offset + node["size"]
        if end > len(data):
            raise ValueError("ASAR file outside payload")
        return data[offset:end]
    root = directory(tree)
    modules = directory(root.get("node_modules"))
    # Fail closed on nested node_modules rather than silently omitting packages.
    count = 0
    pending = [(modules, 0)]
    while pending:
        nodes, depth = pending.pop()
        if depth > 64:
            raise ValueError("ASAR directory depth exceeds bound")
        for key, node in nodes.items():
            count += 1
            if count > 100000 or key in ("", ".", "..") or "/" in key or "\\" in key:
                raise ValueError("Unexpected ASAR member path/count")
            if not isinstance(node, dict):
                raise ValueError("Invalid ASAR node")
            if "link" in node or node.get("unpacked"):
                raise ValueError("External ASAR dependency member requires review")
            if "files" in node:
                if key == "node_modules":
                    raise ValueError("Nested ASAR dependency tree requires review")
                pending.append((directory(node), depth + 1))
    packages = []
    def add_package(name, node):
        if not NAME.fullmatch(name):
            raise ValueError("Unsupported ASAR package name")
        files = directory(node)
        metadata = json.loads(read_regular(files.get("package.json")), object_pairs_hook=unique_object)
        if (not isinstance(metadata, dict) or metadata.get("name") != name
                or not isinstance(metadata.get("version"), str)
                or not VERSION.fullmatch(metadata["version"])):
            raise ValueError("ASAR package identity mismatch")
        notices = []
        for filename, member in sorted(files.items()):
            if NOTICE.fullmatch(filename):
                raw = read_regular(member)
                notices.append({"filename": filename, "bytes": len(raw),
                                "sha256": hashlib.sha256(raw).hexdigest()})
        if not notices:
            raise ValueError("Missing recognized ASAR root notice")
        packages.append({"name": name, "version": metadata["version"],
                         "noticeFiles": notices, "skippedNoticeCount": 0})
    for name, node in sorted(modules.items()):
        if name.startswith("@"):
            for child, member in sorted(directory(node).items()):
                add_package(name + "/" + child, member)
        else:
            add_package(name, node)
    if not packages:
        raise ValueError("Missing ASAR packages")
    return {"asarSha256": hashlib.sha256(data).hexdigest(), "packages": packages}

if __name__ == "__main__":
    try:
        print(json.dumps(inspect_asar(sys.stdin.buffer.read(MAX_ASAR + 1))))
    except (ValueError, OSError, TypeError, RecursionError, struct.error):
        sys.exit("Packaged ASAR notice inspection failed")
