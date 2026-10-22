# Voxnelo

**Practice English, one sentence at a time.**

**English** · [简体中文](README.zh-CN.md)

Voxnelo is an open-source, local-first desktop app for practicing spoken English. Listen to a short sentence, say it yourself, and play back your recording. No account is required.

**Source version:** `0.1.7` (unreleased candidate; public download remains `v0.1.6`) · **Stage:** Early Access (testing) · **Maintainer:** Leo Luo · **License:** [MIT](LICENSE)

## What works in 0.1.6

- **40 English sentences** with Chinese translations, topics, difficulty levels, and optional IPA pronunciation guides.
- **Listen and repeat:** play a sentence using your system's English text-to-speech voice; switch between normal and slow playback.
- **Record and listen back:** grant microphone access, record your own attempt, stop, and replay it during the current practice session.
- **Practice at your pace:** move between sentences or find one through the searchable, topic-filtered catalog.
- **Pick up where you left off:** review local practice history, favorite sentences, and mark sentences for review. Viewing a sentence is not counted as a recording attempt.
- **Make the interface yours:** switch between English and Chinese, Nordic and Sunset themes, IPA visibility, and reduced motion.

## How to use it

1. Open **Practice** and play the example sentence.
2. Select the recording control, allow microphone access, speak, and stop to listen back.
3. Move to another sentence, or use **Favorites**, **History**, or **Review** to revisit it.

The example voice is **system text-to-speech (TTS)**, not a professionally recorded native-speaker voice. Availability and offline playback depend on your operating system and installed voices.

## Download & installation

**v0.1.6 is a PUBLIC, unsigned Early Access preview — not a stable or signed release.** The [GitHub Releases page](https://github.com/kunlong-luo/voxnelo/releases/tag/v0.1.6) provides installers and independent SHA-256 manifests for **Linux, Windows and macOS**. Only use installers from the official releases page; hashes detect mismatched files but do not replace digital signatures.

| Platform | Installer in v0.1.6 | Important limits |
| --- | --- | --- |
| Linux x64 | `Voxnelo.deb` / `voxnelo_0.1.6_amd64.deb` (identical bytes); `Voxnelo-0.1.6.AppImage` | DEB for Debian/Ubuntu/Pop!_OS; AppImage requires suitable system libraries |
| Windows | NSIS `.exe` | **Unsigned**, so SmartScreen may warn; native Moonshine dictation is not provided on Windows |
| macOS | `.dmg` | **Unsigned and not notarized**; Gatekeeper may warn; check your Mac chip architecture and DMG compatibility |

Each platform also has a checksum file: `SHA256SUMS-linux.txt`, `SHA256SUMS-win32.txt` or `SHA256SUMS-darwin.txt`. On Linux, place the appropriate manifest beside the downloaded files and run `sha256sum -c SHA256SUMS-linux.txt`.

To upgrade on Debian-based Linux, download the new package, open `Voxnelo.deb` with your package manager or install the versioned file from its download directory:

```bash
sudo apt install ./voxnelo_0.1.6_amd64.deb
```

Existing installations normally upgrade in place; you should not have to uninstall first. Windows/macOS installers are public **test builds**, not evidence of completed device certification, publisher signing or Apple notarization. See the [user guide](docs/USER-GUIDE.md) and [release notes](docs/release-notes/v0.1.6.md).

## Speech recognition and privacy

**Linux Early Access uses Moonshine Medium Streaming as the default offline English dictation engine.** Standard installers do not bundle the third-party native runtime or model: on Linux, open **Offline Models** and explicitly choose **Install Moonshine**. On Windows and macOS, desktop practice and microphone recording are available, but the same native Moonshine engine is not included or promised to work. The app downloads the pinned SDK and model, checks model SHA-256 before use, then performs recognition locally. Initial setup requires internet, Python 3 with venv and Linux x64. There is no silent Zipformer fallback, no automatic pronunciation scoring, and no word-by-word correction. Real-device noise/accuracy acceptance remains ongoing; see the [Moonshine installation guide](docs/engineering/MOONSHINE-LINUX-INSTALLATION.md).

Practice progress and favorites are stored on the device; there is no Voxnelo account or cross-device sync. Microphone recording requires your permission. Recordings are temporary for playback in the current sentence and are not uploaded by Voxnelo. If you try speech recognition in a web browser, browser-provided services can have different privacy and network behavior.

## Development and support

Voxnelo uses Electron, React, TypeScript, Rsbuild, and local IndexedDB storage. For setup, testing, and packaging commands, see the [development guide](docs/DEVELOPMENT.md).

- [User guide](docs/USER-GUIDE.md)
- [Privacy information (pending release review)](docs/PRIVACY.md)
- [Changelog](CHANGELOG.md)
- [Report a bug or suggest an improvement](https://github.com/kunlong-luo/voxnelo/issues)

Please remove personal information from public issue reports and do not upload private voice recordings.

> **Release status:** Linux Early Access is a public preview only. Automated checks and initial user testing do not certify all devices, course-content review, native redistribution rights, or unsigned package authenticity. The stable release gates remain open.
