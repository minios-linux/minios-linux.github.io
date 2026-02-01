---
title: Getting Started with MiniOS Standard Edition
excerpt: A comprehensive guide to installing and configuring MiniOS Standard Edition on your USB drive or hard disk.
author: MiniOS Team
publishedAt: 2026-01-28T00:00:00.000Z
tags:
  - guide
  - installation
  - standard
featuredImage: /assets/svg/minios_icon.svg
published: true
order: 1
---

# Getting Started with MiniOS Standard Edition

MiniOS Standard is our flagship edition, designed to provide the perfect balance between functionality and performance. This guide will walk you through the installation and initial setup process.

## What You'll Need

Before getting started, make sure you have:

- A USB drive (minimum 4GB recommended)
- The MiniOS Standard ISO file ([download here](https://minios.dev))
- A tool to create bootable USB drives (we recommend Etcher or dd)
- 10-15 minutes of your time

## Step 1: Download MiniOS Standard

Visit our [download page](/) and select MiniOS Standard edition. The ISO file is approximately 1.5GB in size.

## Step 2: Create a Bootable USB Drive

### Using Etcher (Windows, macOS, Linux)

1. Download and install [Etcher](https://www.balena.io/etcher/)
2. Launch Etcher
3. Click "Flash from file" and select your MiniOS ISO
4. Select your USB drive as the target
5. Click "Flash!" and wait for the process to complete

### Using dd (Linux/macOS)

```bash
# Find your USB device
lsblk

# Create bootable USB (replace /dev/sdX with your device)
sudo dd if=minios-standard.iso of=/dev/sdX bs=4M status=progress
sync
```

**Warning**: Double-check your device path! The dd command will overwrite all data on the target device.

## Step 3: Boot from USB

1. Insert the USB drive into your computer
2. Restart your computer
3. Enter the boot menu (usually F12, F2, or DEL during startup)
4. Select the USB drive from the boot menu
5. Wait for MiniOS to load

## Step 4: First Boot Experience

When MiniOS boots for the first time, you'll see:

- **Automatic hardware detection** - MiniOS will recognize your network adapters, graphics card, and other hardware
- **Clean desktop environment** - Flux desktop with essential applications pre-installed
- **Welcome screen** - Quick tips to get you started

## Persistence (Optional)

By default, MiniOS runs in "live" mode - changes are stored in RAM and lost on reboot. To save your changes permanently:

### Method 1: Create Persistence File

```bash
# Create a 4GB persistence file on your USB
sudo minios-genslax persistence 4000

# Reboot to activate persistence
sudo reboot
```

### Method 2: Install to Hard Drive

For a full installation:

1. Open the installer from the application menu
2. Select your target partition
3. Follow the on-screen instructions
4. Reboot and remove the USB drive

## Essential First Steps

After booting MiniOS, we recommend:

1. **Connect to Wi-Fi** - Click the network icon in the system tray
2. **Update packages** - Open terminal and run `sudo apt update && sudo apt upgrade`
3. **Install additional software** - Use `apt install` or the Software Center
4. **Configure settings** - Personalize your desktop and system preferences

## Performance Tips

To get the best performance from MiniOS Standard:

- **Use persistence on SSD/NVMe** - Much faster than USB drives
- **Allocate at least 2GB RAM** - More if you plan to run multiple applications
- **Enable ZRAM** - Automatic memory compression (enabled by default)
- **Close unused applications** - Keep your system responsive

## Troubleshooting

### USB Drive Not Booting

- Verify BIOS/UEFI boot settings
- Try a different USB port (preferably USB 2.0)
- Recreate the bootable USB drive
- Check ISO file integrity (MD5/SHA256 checksum)

### Network Not Working

```bash
# Check network interfaces
ip link show

# Restart network service
sudo systemctl restart NetworkManager
```

### Graphics Issues

MiniOS includes open-source drivers by default. For proprietary GPU drivers:

```bash
# NVIDIA
sudo apt install nvidia-driver

# AMD
sudo apt install firmware-amd-graphics
```

## Next Steps

Now that you have MiniOS Standard running, explore:

- [MiniOS Documentation](https://minios.dev/docs)
- [Community Forum](https://t.me/minios_chat)
- [Advanced Configuration Guide](#) (coming soon)

## Need Help?

If you encounter issues:

- Join our [Telegram community](https://t.me/minios_chat)
- Check the [FAQ section](https://minios.dev/docs/faq)
- Report bugs on [GitHub](https://github.com/minios-linux/minios-live/issues)

---

*Happy computing with MiniOS Standard! 🚀*
