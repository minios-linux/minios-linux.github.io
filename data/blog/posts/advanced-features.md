---
title: Advanced MiniOS Features You Should Know
excerpt: >-
  Unlock the full potential of MiniOS with these powerful but lesser-known
  features that advanced users love.
author: MiniOS Team
publishedAt: '2026-01-15T16:00:00.000Z'
updatedAt: '2026-01-31T23:43:56.878Z'
tags:
  - advanced
  - features
  - tutorial
published: true
---

MiniOS packs many powerful features under the hood. Here are the advanced capabilities that power users should know about.

## 1. Module System

MiniOS uses a modular architecture that allows you to add or remove components on the fly.

### Understanding Modules

```bash
# List loaded modules
ls /memory/bundles/

# View module information
minios-modules list

# Check what's in a module
unsquashfs -l /path/to/module.sb
```

### Loading Modules

```bash
# Download additional modules
wget https://minios.dev/modules/gimp.sb

# Activate module
sudo minios-module activate gimp.sb

# Module is now available without installation!
```

### Creating Custom Modules

Package your own applications:

```bash
# Install application in chroot
sudo debootstrap stable /tmp/module

# Chroot and install
sudo chroot /tmp/module
apt install your-application
exit

# Create squashfs module
sudo mksquashfs /tmp/module custom-app.sb -comp xz -b 1M

# Activate
sudo minios-module activate custom-app.sb
```

## 2. PXE Network Boot

Boot MiniOS over the network - perfect for thin clients or computer labs.

### Server Setup

```bash
# Install TFTP and NFS server
sudo apt install tftpd-hpa nfs-kernel-server

# Extract MiniOS ISO
mkdir /srv/minios
sudo mount -o loop minios.iso /mnt
sudo cp -r /mnt/* /srv/minios/

# Configure TFTP
sudo nano /etc/default/tftpd-hpa
```

**TFTP config:**
```bash
TFTP_USERNAME="tftp"
TFTP_DIRECTORY="/srv/tftp"
TFTP_ADDRESS=":69"
TFTP_OPTIONS="--secure"
```

### Client Boot

```bash
# Configure DHCP to provide boot info
# In your DHCP server:
next-server 192.168.1.100;
filename "pxelinux.0";
```

## 3. Stealth Mode

Run MiniOS without leaving traces on the host system.

### Enable Stealth Features

```bash
# No swap usage
echo 0 | sudo tee /proc/sys/vm/swappiness

# RAM-only mode
# Boot with parameter:
perch

# Encrypted RAM storage
sudo apt install cryptsetup
sudo cryptsetup -y luksFormat /dev/ram0
```

### Secure Cleanup

```bash
# Wipe free space on shutdown
# Add to /etc/rc0.d/
shred -vfz -n 3 /dev/sdX

# Clear bash history
cat /dev/null > ~/.bash_history
history -c
```

## 4. Persistence Encryption

Protect your persistent data with encryption.

### Setup Encrypted Persistence

```bash
# Create encrypted persistence
sudo minios-persistence create --encrypted

# Enter password when prompted
# Data is encrypted with LUKS
```

### Multi-Key Setup

```bash
# Add additional unlock keys
sudo cryptsetup luksAddKey /dev/sdX2

# Remove old key
sudo cryptsetup luksRemoveKey /dev/sdX2
```

## 5. Custom Boot Splash

Create professional-looking boot screens.

### Plymouth Theme Creation

```bash
# Create theme directory
sudo mkdir -p /usr/share/plymouth/themes/custom

# Create theme files
cd /usr/share/plymouth/themes/custom
```

**Example theme definition:**

```ini
[Plymouth Theme]
Name=Custom
Description=My custom theme
ModuleName=script

[script]
ImageDir=/usr/share/plymouth/themes/custom
ScriptFile=/usr/share/plymouth/themes/custom/custom.script
```

### Apply Custom Theme

```bash
# Set as default
sudo plymouth-set-default-theme custom

# Update initramfs
sudo update-initramfs -u

# Test without rebooting
sudo plymouthd
sudo plymouth --show-splash
# Wait a few seconds
sudo plymouth quit
```

## 6. Advanced Networking

### Network Namespaces

Isolate network environments:

```bash
# Create namespace
sudo ip netns add isolated

# Run application in namespace
sudo ip netns exec isolated firefox

# Completely isolated from main network
```

### VPN Auto-Connect

```bash
# Install OpenVPN
sudo apt install openvpn

# Auto-connect on boot
sudo systemctl enable openvpn@config

# Config location
sudo cp your-config.ovpn /etc/openvpn/config.conf
```

## 7. Resource Limits

Control application resource usage.

### CPU Limits

```bash
# Limit Firefox to 50% CPU
systemd-run --scope -p CPUQuota=50% firefox

# Limit specific process
cpulimit -p 1234 -l 25
```

### Memory Limits

```bash
# Launch with memory limit
systemd-run --scope -p MemoryLimit=512M your-app

# Use cgroups directly
sudo cgcreate -g memory:/limited
echo 512M | sudo tee /sys/fs/cgroup/memory/limited/memory.limit_in_bytes
sudo cgexec -g memory:limited your-app
```

## 8. Automated Tasks

### Systemd Timers

Better than cron:

```bash
# Create service
sudo nano /etc/systemd/system/backup.service
```

```ini
[Unit]
Description=Backup Script

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
```

```bash
# Create timer
sudo nano /etc/systemd/system/backup.timer
```

```ini
[Unit]
Description=Run backup daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Enable and start
sudo systemctl enable backup.timer
sudo systemctl start backup.timer
```

## 9. Kernel Parameter Tuning

Optimize for specific workloads.

### Performance Tuning

```bash
# Edit sysctl config
sudo nano /etc/sysctl.d/99-custom.conf
```

**Example optimizations:**

```ini
# Faster networking
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864

# Better responsiveness
vm.swappiness = 10
vm.vfs_cache_pressure = 50

# Gaming optimizations
kernel.sched_min_granularity_ns = 10000000
kernel.sched_wakeup_granularity_ns = 15000000
```

```bash
# Apply changes
sudo sysctl -p /etc/sysctl.d/99-custom.conf
```

## 10. Custom Kernel

Build optimized kernel for your hardware.

### Download Kernel Source

```bash
# Install build tools
sudo apt install build-essential libncurses-dev bison flex libssl-dev libelf-dev

# Get kernel source
wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.1.tar.xz
tar xvf linux-6.1.tar.xz
cd linux-6.1
```

### Configure and Build

```bash
# Copy current config
cp /boot/config-$(uname -r) .config

# Customize
make menuconfig

# Build (adjust -j to CPU count)
make -j$(nproc) deb-pkg

# Install
sudo dpkg -i ../linux-*.deb
```

## 11. Container Support

Run Docker/Podman on MiniOS.

### Setup Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add user to docker group
sudo usermod -aG docker $USER

# Start on boot
sudo systemctl enable docker
```

### Podman (rootless)

```bash
# Install Podman
sudo apt install podman

# Run without root
podman run -it alpine sh

# Works with persistence enabled
```

## 12. Remote Management

Control MiniOS remotely.

### SSH Server

```bash
# Install SSH server
sudo apt install openssh-server

# Configure
sudo nano /etc/ssh/sshd_config
```

**Security recommendations:**

```bash
PermitRootLogin no
PasswordAuthentication no  # Use keys only
Port 2222  # Non-standard port
```

### VNC Server

```bash
# Install x11vnc
sudo apt install x11vnc

# Set password
x11vnc -storepasswd

# Start server
x11vnc -usepw -display :0
```

## Tips for Advanced Users

1. **Combine features**: Use encrypted persistence + VPN + stealth mode for maximum privacy
2. **Module library**: Build a collection of .sb modules for quick deployment
3. **Automation**: Create scripts to setup your perfect environment on any machine
4. **Custom ISO**: Rebuild MiniOS ISO with your modules pre-installed

## Next Level

Want to contribute or learn more?

- [MiniOS Build System](https://github.com/minios-linux/minios-live)
- [Module Repository](https://github.com/minios-linux/modules)
- [Developer Docs](https://docs.minios.dev)

---

*Using MiniOS in creative ways? Share your advanced setups in our [Telegram](https://t.me/minios_chat)!*
