---
title: Contributing to MiniOS - Developer's Guide
excerpt: Want to contribute to MiniOS? Learn how to build, modify, and contribute to the project. From first PR to core contributor.
author: MiniOS Team
publishedAt: '2026-01-08T15:00:00.000Z'
updatedAt: '2026-01-08T15:00:00.000Z'
tags:
  - development
  - contributing
  - advanced
featuredImage: /assets/img/puzzle_00.jpg
published: true
---

MiniOS is open source and welcomes contributors. Whether you want to fix bugs, add features, or create modules, this guide will help you get started.

## Project Structure

### Repositories

**Main repositories:**

```
minios-linux/
├── minios-live          # Core build system
├── minios-tools         # Runtime utilities
├── minios-web          # Website and documentation
├── minios-modules      # Optional module packages
└── minios-themes       # UI themes and customizations
```

### Technology Stack

**Build System:**
- Base: Debian Live Build
- Scripts: Bash
- Package manager: APT
- Compression: SquashFS

**Runtime:**
- Init: systemd
- Display: X11 / Wayland
- Window manager: Openbox
- Panel: Tint2

## Development Environment Setup

### Prerequisites

```bash
# Install build dependencies (Debian/Ubuntu)
sudo apt update
sudo apt install \
    git \
    live-build \
    debootstrap \
    squashfs-tools \
    genisoimage \
    syslinux-utils \
    isolinux \
    xorriso \
    build-essential

# Minimum 20GB free disk space
# 4GB+ RAM recommended
```

### Clone Repository

```bash
# Clone main repository
git clone https://github.com/minios-linux/minios-live.git
cd minios-live

# Checkout development branch
git checkout develop

# Update submodules
git submodule update --init --recursive
```

## Building MiniOS

### Basic Build

```bash
# Build Standard edition
./build.sh standard

# Build Puzzle edition
./build.sh puzzle

# Build Minimum edition
./build.sh minimum
```

**Build process:**
1. Downloads Debian base system
2. Installs packages
3. Applies customizations
4. Creates squashfs filesystem
5. Generates bootable ISO

**Time:** 30-60 minutes (first build)
**Output:** `./build/minios-standard.iso`

### Custom Build

Edit configuration files:

```bash
# Edition-specific config
nano editions/standard/packages.list
nano editions/standard/config.sh

# Global configuration
nano config/build.conf
```

**Example custom build:**

```bash
# Create custom edition
mkdir -p editions/mycustom

# Package list
cat > editions/mycustom/packages.list << 'EOF'
# Base system
linux-image-amd64
systemd
network-manager

# Desktop
xorg
openbox
tint2

# Applications
firefox-esr
vlc
gimp

# Development
git
vim
build-essential
EOF

# Build it
./build.sh mycustom
```

### Module Development

Create custom modules:

**1. Create module structure:**

```bash
mkdir -p modules/my-app
cd modules/my-app
```

**2. Create build script:**

```bash
cat > build.sh << 'EOF'
#!/bin/bash
set -e

# Create working directory
WORKDIR=$(mktemp -d)
cd $WORKDIR

# Bootstrap minimal Debian
debootstrap --variant=minbase stable rootfs http://deb.debian.org/debian

# Chroot and install packages
chroot rootfs /bin/bash << 'CHROOT'
apt update
apt install -y your-application
apt clean
rm -rf /var/lib/apt/lists/*
CHROOT

# Create squashfs module
mksquashfs rootfs my-app.sb -comp xz -b 1M -Xbcj x86

# Output
cp my-app.sb /output/
EOF

chmod +x build.sh
```

**3. Build module:**

```bash
./build.sh
# Output: my-app.sb
```

**4. Test module:**

```bash
# Boot MiniOS
# Copy module
sudo cp my-app.sb /run/initramfs/memory/bundles/

# Activate
sudo activate-module my-app.sb
```

## Coding Standards

### Bash Scripts

```bash
#!/bin/bash
# Script description
# Author: Your Name
# License: GPL-3.0

# Enable strict mode
set -euo pipefail
IFS=$'\n\t'

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly VERSION="1.0.0"

# Functions use lowercase with underscores
function check_dependencies() {
    local deps=("$@")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            echo "Error: $dep not found" >&2
            return 1
        fi
    done
}

# Main function
main() {
    check_dependencies "git" "make"
    echo "Script running..."
}

# Call main
main "$@"
```

### Shell Script Guidelines

1. **Always use strict mode**
```bash
set -euo pipefail
```

2. **Quote variables**
```bash
# Good
echo "$variable"

# Bad
echo $variable
```

3. **Use meaningful names**
```bash
# Good
iso_output_dir="/build/output"

# Bad
dir="/build/output"
```

4. **Error handling**
```bash
if ! command; then
    echo "Error: command failed" >&2
    exit 1
fi
```

## Contributing Workflow

### 1. Fork and Clone

```bash
# Fork on GitHub (click Fork button)

# Clone your fork
git clone https://github.com/YOUR-USERNAME/minios-live.git
cd minios-live

# Add upstream remote
git remote add upstream https://github.com/minios-linux/minios-live.git
```

### 2. Create Feature Branch

```bash
# Update develop branch
git checkout develop
git pull upstream develop

# Create feature branch
git checkout -b feature/my-awesome-feature

# Or for bugfix
git checkout -b fix/issue-123
```

### 3. Make Changes

```bash
# Edit files
nano editions/standard/packages.list

# Test your changes
./build.sh standard

# Test the ISO
qemu-system-x86_64 -m 2048 -cdrom build/minios-standard.iso
```

### 4. Commit Changes

```bash
# Stage changes
git add .

# Commit with meaningful message
git commit -m "Add feature: Custom desktop environment selector

- Added script to choose DE at boot
- Updated documentation
- Added configuration examples

Closes #123"
```

**Commit message format:**
```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

### 5. Push and Create PR

```bash
# Push to your fork
git push origin feature/my-awesome-feature

# Create Pull Request on GitHub
# Compare: minios-linux:develop ← YOUR-USERNAME:feature/my-awesome-feature
```

**PR description template:**

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How did you test this?

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tested on real hardware

## Screenshots (if applicable)
```

## Testing

### VM Testing

```bash
# QEMU
qemu-system-x86_64 \
    -m 2048 \
    -enable-kvm \
    -cdrom build/minios-standard.iso

# VirtualBox
VBoxManage createvm --name "MiniOS-Test" --register
VBoxManage modifyvm "MiniOS-Test" --memory 2048 --vram 128
VBoxManage storagectl "MiniOS-Test" --name "IDE" --add ide
VBoxManage storageattach "MiniOS-Test" --storagectl "IDE" \
    --port 0 --device 0 --type dvddrive \
    --medium build/minios-standard.iso
VBoxManage startvm "MiniOS-Test"
```

### Real Hardware Testing

```bash
# Write to USB for testing
sudo dd if=build/minios-standard.iso of=/dev/sdX bs=4M status=progress oflag=sync

# Test boot on real hardware
# Document any issues
```

### Automated Testing

```bash
# Run test suite
./tests/run-tests.sh

# Specific test
./tests/test-boot.sh
./tests/test-persistence.sh
```

## Code Review Process

### Your PR will be reviewed for:

1. **Functionality** - Does it work?
2. **Code quality** - Readable, maintainable?
3. **Performance** - Any bottlenecks?
4. **Security** - Any vulnerabilities?
5. **Documentation** - Is it documented?
6. **Testing** - Has it been tested?

### Addressing Review Comments

```bash
# Make requested changes
nano file.sh

# Commit changes
git add file.sh
git commit -m "Address review comments: improve error handling"

# Push update
git push origin feature/my-awesome-feature

# PR updates automatically
```

## Documentation

### Where to Document

1. **Code comments** - Inline explanations
2. **README files** - Project/module overview
3. **Wiki** - Detailed guides
4. **Blog posts** - Tutorials and announcements

### Documentation Style

**Markdown formatting:**

```markdown
# Main Heading

Brief introduction.

## Section

Detailed explanation with:
- Bullet points
- **Bold** for emphasis
- `code` for commands

### Subsection

Example:

​```bash
command --with-options
​```

**Note:** Important information.
```

## Community

### Communication Channels

- **GitHub Discussions** - Feature requests, Q&A
- **GitHub Issues** - Bug reports
- **Telegram** - Real-time chat
- **Email** - dev@minios.dev

### Getting Help

**Before asking:**
1. Search existing issues
2. Check documentation
3. Read contributing guidelines

**When asking:**
- Be specific
- Include system info
- Show what you tried
- Provide error messages

## Advanced Topics

### Custom Kernel

```bash
# Download kernel source
wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.1.tar.xz
tar xf linux-6.1.tar.xz
cd linux-6.1

# Use MiniOS config as base
cp /boot/config-$(uname -r) .config

# Customize
make menuconfig

# Build
make -j$(nproc) deb-pkg

# Include in build
cp ../linux-*.deb editions/custom/packages/
```

### Custom Installer

```bash
# Create installer module
mkdir -p modules/installer

# Calamares-based installer
cat > modules/installer/install.sh << 'EOF'
#!/bin/bash
apt install -y calamares
# Configure calamares
cp -r config/* /etc/calamares/
EOF
```

## Recognition

### Hall of Fame

Top contributors get:
- Name in credits
- Special Discord role
- MiniOS swag
- Featured in blog

### Contribution Levels

- **1-5 PRs**: Contributor badge
- **5-20 PRs**: Regular contributor
- **20+ PRs**: Core team consideration
- **Module author**: Module maintainer status

## Resources

**Documentation:**
- [Official Docs](https://docs.minios.dev)
- [API Reference](https://api.minios.dev)
- [Architecture Guide](https://github.com/minios-linux/minios-live/wiki)

**Learning:**
- [Debian Live Manual](https://live-team.pages.debian.net/live-manual/)
- [SquashFS Documentation](https://www.kernel.org/doc/Documentation/filesystems/squashfs.txt)
- [Bash Guide](https://mywiki.wooledge.org/BashGuide)

**Tools:**
- [ShellCheck](https://www.shellcheck.net/) - Bash linter
- [act](https://github.com/nektos/act) - Test GitHub Actions locally

## Quick Start Checklist

- [ ] Install build dependencies
- [ ] Clone repository
- [ ] Build standard edition
- [ ] Test in VM
- [ ] Make small change
- [ ] Build and test again
- [ ] Create PR
- [ ] Join Telegram

Ready to contribute? Start small:
- Fix typos in documentation
- Improve error messages
- Add package to an edition
- Create a module

Every contribution matters!

---

*Questions about contributing? Ask in [GitHub Discussions](https://github.com/minios-linux/minios-live/discussions) or [Telegram](https://t.me/minios_chat)!*
