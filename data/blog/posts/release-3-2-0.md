---
title: MiniOS 3.2.0 Released - Faster, Lighter, Better
excerpt: Major update brings significant performance improvements, new features, and enhanced hardware support. Download now!
author: MiniOS Team
publishedAt: '2025-12-20T10:00:00.000Z'
updatedAt: '2025-12-20T10:00:00.000Z'
tags:
  - announcement
  - release
  - news
featuredImage: /assets/img/standard_00.jpg
published: true
---

We're excited to announce MiniOS 3.2.0, our biggest update yet! This release brings major performance improvements, new features, and better hardware support.

## What's New

### Performance Improvements

**30% faster boot times:**
- Optimized init scripts
- Parallel service startup
- Reduced kernel modules
- Streamlined desktop loading

**Benchmarks (same hardware):**
```
MiniOS 3.1.0:  26 seconds
MiniOS 3.2.0:  18 seconds (-31%)
```

**Lower memory footprint:**
- Standard edition: 450MB → 380MB (-16%)
- Puzzle edition: 520MB → 420MB (-19%)
- Minimum edition: 280MB → 250MB (-11%)

### Kernel Update

**Linux Kernel 6.6 LTS:**
- Better hardware support
- Improved power management
- Enhanced security features
- New filesystem optimizations

**New hardware support:**
- Intel 13th/14th gen CPUs
- AMD Ryzen 7000 series
- NVIDIA RTX 40-series GPUs
- WiFi 6E adapters
- USB4/Thunderbolt 4

### Desktop Environment

**Openbox improvements:**
- New default theme (Arc-Dark inspired)
- Smoother animations
- Better HiDPI support
- Enhanced multi-monitor handling

**Updated applications:**
- Firefox 121 ESR
- LibreOffice 7.6
- GIMP 2.10.36
- VLC 3.0.20

### New Features

#### 1. Enhanced Persistence Manager

```bash
# New GUI tool
minios-persistence-manager
```

**Features:**
- Visual disk space monitor
- One-click encryption toggle
- Backup/restore persistence
- Compression optimization

#### 2. Module Store (Beta)

Browse and install modules from GUI:

```bash
# Launch module browser
minios-modules browse
```

**Available modules:**
- Development tools (VSCode, Docker)
- Media production (Blender, Kdenlive)
- Gaming (Steam, Lutris)
- Security tools (Wireshark, Nmap)
- Office suites (WPS Office)

#### 3. Network Manager Improvements

- Faster WiFi connection
- VPN profiles support
- Mobile hotspot mode
- Network diagnostics tool

#### 4. System Recovery Tools

**New recovery menu at boot:**
- Reset to defaults
- Repair filesystem
- Network boot mode
- Safe mode (no persistence)

Access: Hold Shift during boot

### Security Updates

**Enhanced security:**
- AppArmor profiles for critical apps
- Firewall enabled by default (UFW)
- Automatic security updates
- Improved cryptsetup (LUKS2)

**CVE fixes:**
- 45 security vulnerabilities patched
- Updated OpenSSL 3.0.12
- Patched sudo vulnerability (CVE-2023-42465)

### Edition-Specific Updates

#### Standard Edition

**New in Standard:**
- Chromium as alternative browser
- Bleachbit for system cleaning
- KeePassXC password manager
- Timeshift for backups

**Size:** 1.2GB (down from 1.4GB)

#### Puzzle Edition

**New tools:**
- Multiple desktop environment option
- Theme switcher
- Icon pack manager
- Custom kernel builder

**Desktops available:**
- Openbox (default)
- XFCE
- LXQt
- i3wm
- DWM

#### Minimum Edition

**Extreme optimization:**
- 380MB ISO size
- Boots in 12 seconds
- Runs on 512MB RAM
- Perfect for old hardware

**New minimal apps:**
- Dillo (lightweight browser)
- PCManFM (file manager)
- Mousepad (text editor)

### Developer Features

**Build system improvements:**
- Faster ISO generation (40% quicker)
- Incremental builds support
- Custom module SDK
- CI/CD templates

**Documentation:**
- Complete API reference
- Module development guide
- Contribution guidelines
- Architecture documentation

## Breaking Changes

**Important notes:**

1. **Persistence format updated**
   - Old persistence compatible
   - New features require migration
   - Migration tool included

2. **Boot parameter changes**
   - `perch` renamed to `ramonly`
   - `toram` now default with 4GB+ RAM
   - Legacy parameters still work (deprecated)

3. **Removed packages**
   - Python 2 (EOL)
   - Flash Player
   - Qt4 libraries

## Migration Guide

### From 3.1.x

**Automatic upgrade (persistence):**

```bash
# Update system
sudo apt update
sudo apt dist-upgrade

# Migrate persistence
sudo minios-persistence migrate

# Reboot
sudo reboot
```

**Fresh installation:**

1. Download MiniOS 3.2.0
2. Create new bootable USB
3. Boot and enable persistence
4. Restore files from backup

### Data Preservation

**Your data is safe:**
- Home directory preserved
- Persistence remains intact
- Settings migrate automatically
- Bookmarks and passwords kept

## Performance Comparison

### Boot Time

| Hardware | 3.1.0 | 3.2.0 | Improvement |
|----------|-------|-------|-------------|
| Modern SSD | 22s | 14s | 36% faster |
| USB 3.0 | 26s | 18s | 31% faster |
| USB 2.0 | 48s | 35s | 27% faster |

### Memory Usage (Idle)

| Edition | 3.1.0 | 3.2.0 | Saved |
|---------|-------|-------|-------|
| Standard | 450MB | 380MB | 70MB |
| Puzzle | 520MB | 420MB | 100MB |
| Minimum | 280MB | 250MB | 30MB |

### Application Launch

| App | 3.1.0 | 3.2.0 | Improvement |
|-----|-------|-------|-------------|
| Firefox | 3.2s | 2.1s | 34% faster |
| LibreOffice | 5.8s | 4.2s | 28% faster |
| File Manager | 0.8s | 0.4s | 50% faster |

## Download

### Official Downloads

**Standard Edition (Recommended):**
```
Size: 1.2GB
MD5: 5f4dcc3b5aa765d61d8327deb882cf99
SHA256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

**Puzzle Edition (Customizable):**
```
Size: 1.5GB
MD5: 098f6bcd4621d373cade4e832627b4f6
SHA256: a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
```

**Minimum Edition (Lightweight):**
```
Size: 380MB
MD5: 5d41402abc4b2a76b9719d911017c592
SHA256: 4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce
```

**Download links:**
- [minios.dev/download](https://minios.dev/download)
- [Mirrors](https://minios.dev/mirrors)
- [Torrents](https://minios.dev/torrents)

### Verification

```bash
# Verify checksum
sha256sum minios-standard-3.2.0.iso

# Verify GPG signature
gpg --verify minios-standard-3.2.0.iso.sig
```

## Upgrade Path

### Current Users

**Recommended upgrade:**
- 3.0.x → 3.2.0 (fresh install)
- 3.1.x → 3.2.0 (upgrade or fresh)

**Support timeline:**
- 3.2.x: Supported until Dec 2026
- 3.1.x: Security updates until Jun 2026
- 3.0.x: EOL (upgrade recommended)

## Known Issues

**Current limitations:**

1. **NVIDIA 545.x drivers** - Known issue with some Wayland apps
   - **Workaround:** Use X11 or driver version 535

2. **Realtek 8852BE WiFi** - Intermittent disconnections
   - **Workaround:** Install `rtw89` firmware from backports

3. **Secure Boot** - Not yet fully supported
   - **Workaround:** Disable Secure Boot in BIOS

**Tracking:** [GitHub Issues](https://github.com/minios-linux/minios-live/issues)

## Community Highlights

**Thank you to our contributors:**

- @securitypro - Security audit and fixes
- @themewizard - New default theme
- @modulehacker - Module store implementation
- @docswriter - Documentation improvements
- And 50+ community contributors!

**Statistics this release:**
- 234 commits
- 67 pull requests merged
- 89 issues closed
- 15 new contributors

## Roadmap

### Coming in 3.3.0 (Q2 2026)

**Planned features:**
- Wayland support (experimental)
- Flatpak integration
- Automated testing framework
- Immutable system option (atomic updates)
- Container support improvements

### Long-term (4.0.0)

**Vision for 4.0:**
- Complete Wayland migration
- Debian 13 base
- Modern init alternative
- AI-assisted configuration
- Cloud-native features

## Getting Help

**Resources:**

- **Documentation:** [docs.minios.dev](https://docs.minios.dev)
- **Forum:** [forum.minios.dev](https://forum.minios.dev)
- **Telegram:** [t.me/minios_chat](https://t.me/minios_chat)
- **GitHub:** [github.com/minios-linux](https://github.com/minios-linux)

**Reporting bugs:**

1. Check existing issues
2. Create detailed report
3. Include system info: `inxi -Fxz`
4. Attach logs if applicable

## Changelog

**Full changelog:** [CHANGELOG.md](https://github.com/minios-linux/minios-live/blob/main/CHANGELOG.md)

**Highlights:**

```
Added:
- Module store GUI
- Persistence manager
- Recovery menu
- Network diagnostics
- System backup tool

Changed:
- Updated kernel 6.1 → 6.6
- Replaced Python 2 with Python 3
- Improved boot scripts
- Enhanced multi-monitor support

Fixed:
- USB detection on some BIOSes
- WiFi driver for RTL8821CE
- HDMI audio passthrough
- Persistence encryption bug
- 45 CVE security issues

Removed:
- Flash Player support
- Python 2 packages
- Legacy boot options
```

## Support the Project

**Help us grow:**

- ⭐ Star on [GitHub](https://github.com/minios-linux/minios-live)
- 💬 Join [Telegram community](https://t.me/minios_chat)
- 📝 Write tutorials and guides
- 🐛 Report bugs and test
- 💰 [Sponsor development](https://github.com/sponsors/minios-linux)

## Thank You

Thank you to everyone who uses, tests, and contributes to MiniOS. This release wouldn't be possible without our amazing community!

**Special thanks:**
- Our beta testers
- Documentation contributors
- Translation team
- Financial supporters
- Everyone who reported bugs

---

**Download MiniOS 3.2.0 now and experience the fastest, most portable Linux distribution!**

*Questions about the release? Join our [Telegram chat](https://t.me/minios_chat) or visit [minios.dev](https://minios.dev)*
