"""Pinned Ubuntu AppImage notice/source delivery inputs (not legal approval).

Exact DEB and source archive identities measured by review runs 45746633439
and 45747038504. No source build, signature or license interpretation here.
Never execute or install any downloaded package or extract archive trees.
"""
import io
from pathlib import Path
import tarfile

BUNDLE = "Ubuntu-AppImage-source"
PREFIX = "resources/THIRD-PARTY-NOTICES/" + BUNDLE + "/"
# package, filename version, full version, pool, archive SHA, copyright SHA,
# original member basename, actual AppImage member basename, ELF SHA
LEGACY = (
    ("libxss1", "1.2.2-1", "1:1.2.2-1", "libx/libxss",
     "759a4a9e185c76172efc48184398d377279e870a57e1ae17fe97a21067dda479",
     "6b822bc28b9b4dfddac70104ebb55d1116da3aede42065d80168ba732ef46502",
     "libXss.so.1.0.0", "libXss.so.1", "270fe6e4d430118793d01cac5c6081d0ea9e244cfcf510475bc779bef21b754a"),
    ("libappindicator1", "12.10.1+13.10.20130920-0ubuntu4", "12.10.1+13.10.20130920-0ubuntu4", "liba/libappindicator",
     "2993735f38a5eecb6b2f68af99dabaa32d9c44ff16c4c9c5d8e95a07e9e78cd5",
     "518f65dcd8b7a81d83c5e9dcdad5635b3d18e3e529a85ae53af0090a94ab508d",
     "libappindicator.so.1.0.0", "libappindicator.so.1", "033b8803f20b98e8cd56fc8e75e3a71a552f75c0cff9bd0937f3ddd6ee5d2145"),
    ("libgconf-2-4", "3.2.6-0ubuntu2", "3.2.6-0ubuntu2", "g/gconf",
     "952e3f4ed08461e2f95f38b54c66f6a84a6a393a4580e0a64ce9fe84db5b5530",
     "2b3bf476b11bc6405fa1d58c8d83c1b3fea4f26f56bd486bc63c6a6b91eb4353",
     "libgconf-2.so.4.1.5", "libgconf-2.so.4", "ba977334112bb81f6457ee4aad833c6d5f1ff731c718073cd50777d613b23185"),
    ("libindicator7", "12.10.2+14.04.20140402-0ubuntu1", "12.10.2+14.04.20140402-0ubuntu1", "libi/libindicator",
     "3b8ca09d67c91f076d2880694e0e7a896e01d6d96c1f8b29526ba497dc905b31",
     "2ff451abf91d34acfb35b943fa62d2b49053ae28aa6232dd6f8eddcacebb4b6b",
     "libindicator.so.7.0.0", "libindicator.so.7", "3b61ae3424c4800975c1806245a2d286f6e1fc49cd9350913075c27a95f3c7a0"),
    ("libnotify4", "0.7.6-1ubuntu3", "0.7.6-1ubuntu3", "libn/libnotify",
     "c663fc5c7d35e8ff8a08b9ad57f7c121262e22424f8b87da494ce55a9fcd8e9a",
     "5456597d0b556f4c0aadeaefc793358115c3a7a56ab87a9846e2366344d7549d",
     "libnotify.so.4.0.0", "libnotify.so.4", "8f42294247a886c5a94b2a0ce1c0b65e953616d7efe8da664b3826cdeae47948"),
)
# Exact .dsc + referenced original and Debian delta for each selected binary.
SOURCES = (
    ("libx/libxss", (
        ("libxss_1.2.2-1.dsc", "22379490d80d7661c793f0f016a5e12255fdb53a0b2b58b6fe14afa805fcac3f"),
        ("libxss_1.2.2.orig.tar.gz", "e12ba814d44f7b58534c0d8521e2d4574f7bf2787da405de4341c3b9f4cc8d96"),
        ("libxss_1.2.2-1.diff.gz", "fcc9c125f3af01da27f6cee798410a7907a63802f5c6360f972e12b1ff59e6c1"),
    )),
    ("libx/libxtst", (
        ("libxtst_1.2.3-1ubuntu0.22.04.1.dsc", "52a2ae40cc68c8c6ba07b352a2d82deddace882a2a6f709b7e2cc67b027a57c9"),
        ("libxtst_1.2.3.orig.tar.gz", "a0c83acce02d4923018c744662cb28eb0dbbc33b4adc027726879ccf68fbc2c2"),
        ("libxtst_1.2.3-1ubuntu0.22.04.1.diff.gz", "1c9a23f0e3f031dee9625dec0179e85abb894f666467797c70006b92c76171be"),
    )),
    ("liba/libappindicator", (
        ("libappindicator_12.10.1+13.10.20130920-0ubuntu4.dsc", "5a9510dbdc1f643df058686e881b93570dd0e70688c927077a8c0b9f1812cdc9"),
        ("libappindicator_12.10.1+13.10.20130920.orig.tar.gz", "0b93526101c07cce65a3d8dc3d43e77e06780ce023ab82605e32c8babc139a2c"),
        ("libappindicator_12.10.1+13.10.20130920-0ubuntu4.diff.gz", "eba447e640f1df6537b55c5c94703f4faf6ba365fefe15730a29f6578d75a14e"),
    )),
    ("g/gconf", (
        ("gconf_3.2.6-0ubuntu2.dsc", "f82088533828540a3b1ca97f58b87568003eca1cdc3a1f5b1d83b0b91161715e"),
        ("gconf_3.2.6.orig.tar.xz", "1912b91803ab09a5eed34d364bf09fe3a2a9c96751fde03a4e0cfa51a04d784c"),
        ("gconf_3.2.6-0ubuntu2.debian.tar.gz", "7ef4d5a3d4149c6707d645cc1f57189a48da87c41ebc235a6d51a62653ac38de"),
    )),
    ("libi/libindicator", (
        ("libindicator_12.10.2+14.04.20140402-0ubuntu1.dsc", "68d6d1b6a3f9177e8306a1aeb3cb1bcb0d1c86a06ee18c8dcbbaff90140b8866"),
        ("libindicator_12.10.2+14.04.20140402.orig.tar.gz", "89390bb92d7b2324f4c7396d7a15da37e2943d4f55d86ba6284fc0ce60223a67"),
        ("libindicator_12.10.2+14.04.20140402-0ubuntu1.diff.gz", "7ab838d01ad7f5213e6ab3bc9fe60d1be83a360976c88d30e9ae66a3881bf775"),
    )),
    ("libn/libnotify", (
        ("libnotify_0.7.6-1ubuntu3.dsc", "75fded2321055566ffda8a045cbd97e078994f70f743f3c266c9916192314607"),
        ("libnotify_0.7.6.orig.tar.xz", "0ef61ca400d30e28217979bfa0e73a7406b19c32dd76150654ec5b2bdf47d837"),
        ("libnotify_0.7.6-1ubuntu3.debian.tar.gz", "fcf89036400453d43c3181aecccea1bb51c8ae1304a84bccbb6951918d6bfdfa"),
    )),
)
# Output name, exact pinned source archive, regular member, measured digest.
COPYING = (
    ("libxss-COPYING.txt", "libxss_1.2.2.orig.tar.gz", "libXScrnSaver-1.2.2/COPYING", "5cf3e16f5dd753a4c0853e8227134ab65f5562d9ef89b1a2d7681f5c8ac9feb5"),
    ("libxtst-COPYING.txt", "libxtst_1.2.3.orig.tar.gz", "libXtst-1.2.3/COPYING", "940190489c7a0e5ae3d83fc4fcbd79e0cd1b765bf1a4efd408293c1ee0332ceb"),
    ("libappindicator-LGPL-2.1.txt", "libappindicator_12.10.1+13.10.20130920.orig.tar.gz", "libappindicator-12.10.1+13.10.20130920/COPYING.LGPL.2.1", "a9bdde5616ecdd1e980b44f360600ee8783b1f99b8cc83a2beb163a0a390e861"),
    ("libappindicator-LGPL-3.txt", "libappindicator_12.10.1+13.10.20130920.orig.tar.gz", "libappindicator-12.10.1+13.10.20130920/COPYING", "a853c2ffec17057872340eee242ae4d96cbf2b520ae27d903e1b2fef1a5f9d1c"),
    ("gconf-LGPL-2.txt", "gconf_3.2.6.orig.tar.xz", "GConf-3.2.6/COPYING", "94b03f1a60a7fd5007149530626a895a6ef5a8b9342abfd56860c5f3956f5d23"),
    ("libindicator-GPL-3.txt", "libindicator_12.10.2+14.04.20140402.orig.tar.gz", "libindicator-12.10.2+14.04.20140402/COPYING", "8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903"),
    ("libnotify-LGPL-2.1.txt", "libnotify_0.7.6.orig.tar.xz", "libnotify-0.7.6/COPYING", "a190dc9c8043755d90f8b0a75fa66b9e42d4af4c980bf5ddc633f0124db3cee7"),
)
README = b"""Ubuntu native library notices and source archives (Linux x64 AppImage)
The five copyright files in this directory and ../Ubuntu-libXtst.txt
are the complete copyright members of the matched Ubuntu binary packages.
COPYING files are the actual upstream license texts. See the copyright
files for component-specific terms, including GPL-3 and LGPL terms.
The sources/ directory contains the original .dsc, upstream tarball and
Debian delta for each of the six native libraries. Keep these archives
with the distributed binary; they can be copied without executing them.
The libappindicator upstream LGPL texts and Ubuntu default GPL-3
declaration must both be retained. No license of Voxnelo is changed here.
These source sets do not represent a legal decision or proof of a
reproduced build. Other runtime and installer dependencies have their
own notices and obligations. No downloaded source is executed by Voxnelo.
"""

def urls(pool, name):
    return tuple("https://" + host + "/ubuntu/pool/main/" + pool + "/" + name
                 for host in ("archive.ubuntu.com", "old-releases.ubuntu.com", "security.ubuntu.com"))


def read_copying(raw, member):
    """Read exactly one bounded regular member, never extract a tar tree."""
    found = None
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:*") as archive:
        for count, item in enumerate(archive, 1):
            if count > 20000:
                raise ValueError("Source archive member count exceeded")
            if item.name != member:
                continue
            if found is not None or not item.isfile() or not 0 < item.size <= 65536:
                raise ValueError("Invalid COPYING member")
            with archive.extractfile(item) as stream:
                found = stream.read(65537)
            if len(found) != item.size:
                raise ValueError("Truncated COPYING member")
    if found is None:
        raise ValueError("Missing COPYING member")
    return found


def expected_members(digest):
    """Expected regular AppImage member paths and hashes, independent of staging."""
    result = {"usr/lib/" + entry[7]: entry[8] for entry in LEGACY}
    result.update({PREFIX + entry[0] + "-copyright.txt": entry[5] for entry in LEGACY})
    result.update({PREFIX + "sources/" + name: sha for _, files in SOURCES for name, sha in files})
    result.update({PREFIX + name: sha for name, _, _, sha in COPYING})
    result[PREFIX + "README.txt"] = digest(README)
    return result


def prepare_bundle(bundle, temp, toolset, download, read_regular, require_bytes,
                   dpkg_output, selected_members):
    """Stage exact notices and source inputs under a caller-owned fresh directory."""
    (bundle / "sources").mkdir()
    for package, version, full_version, pool, archive_sha, notice_sha, elf, dest, elf_sha in LEGACY:
        filename = f"{package}_{version}_amd64.deb"
        deb = temp / filename
        download(urls(pool, filename), deb, archive_sha)
        require_bytes(read_regular(deb, 4 * 1024 * 1024), archive_sha, filename)
        fields = [dpkg_output(["--field", str(deb), name]).decode().strip()
                  for name in ("Package", "Version", "Architecture")]
        if fields != [package, full_version, "amd64"]:
            raise ValueError("Legacy distro package identity mismatch: " + package)
        elf_path = "usr/lib/x86_64-linux-gnu/" + elf
        notice_path = "usr/share/doc/" + package + "/copyright"
        members = selected_members(dpkg_output(["--fsys-tarfile", str(deb)]), {elf_path, notice_path})
        require_bytes(members[elf_path], elf_sha, package + " original ELF")
        require_bytes(read_regular(toolset / "lib/x64" / dest, 4 * 1024 * 1024), elf_sha, package + " toolset ELF")
        notice = require_bytes(members[notice_path], notice_sha, package + " copyright")
        (bundle / (package + "-copyright.txt")).write_bytes(notice)
    for pool, files in SOURCES:
        for name, sha in files:
            target = bundle / "sources" / name
            download(urls(pool, name), target, sha)
            require_bytes(read_regular(target, 4 * 1024 * 1024), sha, name)
    for name, filename, member, sha in COPYING:
        raw = read_regular(bundle / "sources" / filename, 4 * 1024 * 1024)
        (bundle / name).write_bytes(require_bytes(read_copying(raw, member), sha, name))
    (bundle / "README.txt").write_bytes(README)
