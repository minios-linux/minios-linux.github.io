---
title: Troubleshooting Common MiniOS Issues
excerpt: Quick solutions to the most common problems users encounter. Get back up and running in minutes.
author: MiniOS Team
publishedAt: '2026-01-18T09:00:00.000Z'
updatedAt: '2026-01-18T09:00:00.000Z'
tags:
  - troubleshooting
  - support
  - guide
featuredImage: /assets/img/standard_00.jpg
published: true
---

Running into issues with MiniOS? Here are solutions to the most common problems.

## Boot Issues

### MiniOS Won't Boot

**Problem:** Black screen or boot hangs

**Solutions:**

1. **Check boot parameters:**
```bash
# Try adding these at boot:
nomodeset acpi=off
```

2. **Verify USB creation:**
```bash
# Recreate USB properly
sudo dd if=minios.iso of=/dev/sdX bs=4M status=progress oflag=sync
```

3. **Check USB boot order in BIOS:**
- Press F2/F12/Del during startup
- Set USB as first boot device
- Disable Secure Boot if needed

### Kernel Panic on Boot

**Problem:** System crashes with kernel panic message

**Solution:**
```bash
# At boot menu, add:
init=/bin/bash

# Once booted, check logs:
dmesg | grep -i error
journalctl -xb
```

## Display Problems

### No Display / Black Screen

**Symptoms:** System boots but screen is black

**Solutions:**

1. **Force VESA mode:**
```bash
# Boot parameter:
vga=791 nomodeset
```

2. **Install correct graphics drivers:**
```bash
# For NVIDIA:
sudo apt install nvidia-driver

# For AMD:
sudo apt install firmware-amd-graphics

# For Intel:
sudo apt install xserver-xorg-video-intel
```

### Wrong Resolution

**Problem:** Display resolution is incorrect

**Solution:**
```bash
# List available modes
xrandr

# Set resolution manually
xrandr --output HDMI-1 --mode 1920x1080

# Make permanent
nano ~/.config/autostart/resolution.desktop
```

**Example autostart file:**
```desktop
[Desktop Entry]
Type=Application
Name=Set Resolution
Exec=xrandr --output HDMI-1 --mode 1920x1080
```

### Dual Monitor Issues

```bash
# Detect monitors
xrandr --query

# Enable second monitor (extend right)
xrandr --output HDMI-1 --auto --right-of eDP-1

# Mirror displays
xrandr --output HDMI-1 --same-as eDP-1

# Use GUI tool
arandr
```

## Network Problems

### WiFi Not Working

**Diagnosis:**
```bash
# Check if WiFi device is detected
lspci | grep -i network
ip link show

# Check for firmware
dmesg | grep -i firmware
```

**Solutions:**

1. **Install missing firmware:**
```bash
sudo apt update
sudo apt install firmware-linux-nonfree
sudo apt install firmware-iwlwifi  # For Intel WiFi
```

2. **Enable WiFi:**
```bash
# Check if blocked
rfkill list

# Unblock if needed
sudo rfkill unblock wifi

# Restart network manager
sudo systemctl restart NetworkManager
```

### Ethernet Not Working

```bash
# Check interface status
ip link show

# Bring interface up
sudo ip link set eth0 up

# Request IP address
sudo dhclient eth0

# Or use NetworkManager
nmcli device connect eth0
```

### Can't Connect to WiFi Network

**Problem:** Network appears but won't connect

**Solutions:**

1. **Check saved credentials:**
```bash
# Remove old connection
nmcli connection delete "NetworkName"

# Reconnect with fresh credentials
nmcli device wifi connect "NetworkName" password "YourPassword"
```

2. **Check time/date:**
```bash
# Incorrect time can cause SSL errors
sudo timedatectl set-ntp true
```

## Sound Issues

### No Sound

**Diagnosis:**
```bash
# Check if card is detected
aplay -l

# Test sound
speaker-test -t wav -c 2
```

**Solutions:**

1. **Unmute and increase volume:**
```bash
# Open mixer
alsamixer

# Press 'M' to unmute
# Arrow keys to adjust volume
```

2. **Select correct output:**
```bash
# List sinks
pactl list sinks short

# Set default sink
pactl set-default-sink 1
```

3. **Restart audio:**
```bash
pulseaudio -k
pulseaudio --start
```

## Persistence Problems

### Changes Don't Persist

**Problem:** Settings/files are lost after reboot

**Solution:**
```bash
# Check if persistence is enabled
df -h | grep minios

# Create persistence
sudo minios-persistence create

# Verify
sudo minios-persistence status
```

### Persistence Full

**Problem:** "No space left on device" errors

**Solutions:**
```bash
# Check usage
df -h

# Clean package cache
sudo apt clean
sudo apt autoremove

# Clean journal
sudo journalctl --vacuum-time=3d

# Remove old kernels
sudo apt autoremove --purge
```

## Performance Issues

### System Running Slow

**Diagnosis:**
```bash
# Check CPU usage
top

# Check memory
free -h

# Check I/O wait
iostat -x 1
```

**Solutions:**

1. **Close unnecessary applications:**
```bash
# Kill resource-heavy processes
htop  # Interactive - press F9 to kill
```

2. **Disable services:**
```bash
# List running services
systemctl list-units --type=service --state=running

# Disable unneeded services
sudo systemctl disable bluetooth.service
```

3. **Enable ZRAM:**
```bash
# Check if active
zramctl

# Should show compressed swap
```

### USB Drive Slow

**Problem:** MiniOS runs slowly from USB

**Checks:**
```bash
# Verify USB 3.0 connection
lsusb -t  # Look for 5000M

# Test drive speed
sudo hdparm -tT /dev/sdb
```

**Expected:**
- USB 2.0: ~30 MB/s (too slow)
- USB 3.0: 100-200 MB/s (good)
- USB 3.1: 300-500 MB/s (excellent)

## Package Management Issues

### apt update Fails

**Problem:** Repository errors during update

**Solutions:**
```bash
# Fix broken repositories
sudo apt update --allow-releaseinfo-change

# Reset sources list
sudo nano /etc/apt/sources.list

# Update package index
sudo apt update
```

### Broken Packages

```bash
# Fix broken dependencies
sudo apt --fix-broken install

# Reconfigure packages
sudo dpkg --configure -a

# Force reinstall if needed
sudo apt install --reinstall package-name
```

## Application-Specific Issues

### Browser Crashes

**Solution:**
```bash
# Clear browser cache
rm -rf ~/.cache/chromium
rm -rf ~/.mozilla/firefox/*.default-release/cache2

# Launch with clean profile
firefox -safe-mode
chromium --disable-extensions
```

### Terminal Not Opening

**Solution:**
```bash
# Try alternative terminal
# Press Alt+F2 and type:
xterm

# Then reinstall your terminal
sudo apt install --reinstall xfce4-terminal
```

## System Recovery

### Reset to Defaults

**Problem:** System is completely broken

**Solution:**

1. **Boot in emergency mode:**
```bash
# Add to boot parameters:
systemd.unit=emergency.target
```

2. **Reset user config:**
```bash
# Backup first
mv ~/.config ~/.config.backup
mv ~/.local ~/.local.backup

# Restart X session
sudo systemctl restart lightdm
```

3. **Last resort - reinstall:**
- Boot from fresh MiniOS USB
- Your files in persistence remain intact
- Only system is reset

## Getting Help

If these solutions don't work:

1. **Check logs:**
```bash
# System log
sudo journalctl -xe

# X server log
cat ~/.local/share/xorg/Xorg.0.log

# Kernel messages
dmesg
```

2. **Get system info:**
```bash
# Generate system report
sudo inxi -Fxz > system-info.txt
```

3. **Ask the community:**
- [Telegram Support](https://t.me/minios_chat)
- Provide: MiniOS version, error messages, system info

## Prevention Tips

✓ Always safely eject USB drives
✓ Keep system updated: `sudo apt update && sudo apt upgrade`
✓ Don't force shutdown - use proper shutdown
✓ Use quality USB drives (avoid cheap ones)
✓ Keep backups of important configs

---

*Still stuck? Our [Telegram community](https://t.me/minios_chat) is here to help 24/7!*
