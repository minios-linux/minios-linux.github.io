---
title: Creating a Bootable MiniOS USB - The Complete Guide
excerpt: Step-by-step instructions for creating a bootable MiniOS USB drive on Windows, macOS, and Linux. All methods covered.
author: MiniOS Team
publishedAt: '2026-01-28T11:00:00.000Z'
updatedAt: '2026-01-28T11:00:00.000Z'
tags:
  - tutorial
  - installation
  - getting-started
featuredImage: /assets/img/standard_00.jpg
published: true
---

Creating a bootable MiniOS USB is your first step to experiencing the fastest, most portable Linux distribution. This guide covers all methods.

## What You'll Need

- **USB drive**: 4GB minimum (8GB+ recommended)
- **MiniOS ISO**: Download from [minios.dev](https://minios.dev)
- **15 minutes** of your time

**Important:** All data on the USB drive will be erased. Backup first!

## Method 1: Windows

### Using Rufus (Recommended)

**Step 1: Download Rufus**
- Visit [rufus.ie](https://rufus.ie)
- Download Rufus (portable version, no installation needed)

**Step 2: Prepare USB**
1. Insert your USB drive
2. Launch Rufus
3. Rufus should auto-detect your USB drive

**Step 3: Configure Rufus**

```
Device: [Your USB Drive]
Boot selection: [Click SELECT, choose MiniOS ISO]
Partition scheme: MBR
Target system: BIOS or UEFI
Volume label: MINIOS
File system: FAT32
Cluster size: 4096 bytes (Default)
```

**Step 4: Write**
1. Click **START**
2. If prompted, select:
   - Write in ISO Image mode (recommended)
   - Or DD Image mode for maximum compatibility
3. Wait 5-10 minutes
4. Click **CLOSE** when done

### Using Ventoy (Multi-Boot)

Ventoy lets you boot multiple ISOs from one USB:

**Step 1: Install Ventoy**
1. Download from [ventoy.net](https://www.ventoy.net)
2. Extract and run `Ventoy2Disk.exe`
3. Select your USB drive
4. Click **Install**

**Step 2: Copy ISOs**
1. After installation, USB appears as normal drive
2. Simply copy MiniOS ISO to the USB
3. Add more ISOs as needed
4. Boot and select which OS to run

**Advantages:**
- Keep multiple Linux distros on one USB
- No re-flashing needed
- ISO files stay intact

### Using balenaEtcher

**Step 1: Download Etcher**
- Visit [balena.io/etcher](https://balena.io/etcher)
- Download and install

**Step 2: Flash**
1. Launch Etcher
2. Click **Flash from file** → Select MiniOS ISO
3. Click **Select target** → Choose USB drive
4. Click **Flash!**
5. Wait for completion

## Method 2: macOS

### Using balenaEtcher (Easiest)

Same as Windows method above - Etcher works identically on macOS.

### Using dd (Terminal Method)

**Step 1: Find USB device**

```bash
# List all disks
diskutil list

# Look for your USB drive, e.g., /dev/disk2
# Note the identifier!
```

**Step 2: Unmount USB**

```bash
# Replace disk2 with your disk number
diskutil unmountDisk /dev/disk2
```

**Step 3: Write ISO**

```bash
# CAREFUL: Wrong disk number will destroy data!
sudo dd if=~/Downloads/minios-standard.iso of=/dev/rdisk2 bs=1m status=progress

# Use /dev/rdisk (with 'r') for faster writing
```

**Step 4: Eject**

```bash
diskutil eject /dev/disk2
```

**Expected time:** 5-15 minutes depending on USB speed

### Using UNetbootin

```bash
# Install via Homebrew
brew install --cask unetbootin

# Launch and follow GUI prompts
```

## Method 3: Linux

### Using dd (Universal)

**Step 1: Find USB device**

```bash
# List block devices
lsblk

# Or use:
sudo fdisk -l

# Identify your USB (usually /dev/sdb or /dev/sdc)
```

**Step 2: Unmount partitions**

```bash
# If USB has partitions mounted
sudo umount /dev/sdb1
sudo umount /dev/sdb2
```

**Step 3: Write ISO**

```bash
# CAREFUL: Verify device name!
sudo dd if=minios-standard.iso of=/dev/sdb bs=4M status=progress oflag=sync

# Wait for completion (5-15 minutes)
sync
```

**Parameters explained:**
- `if=` - Input file (ISO)
- `of=` - Output device (USB)
- `bs=4M` - Block size (faster writing)
- `status=progress` - Show progress
- `oflag=sync` - Ensure data is written

### Using GNOME Disks (GUI)

**Step 1: Launch Disks**

```bash
gnome-disks
```

**Step 2: Select USB drive** (left panel)

**Step 3: Restore Disk Image**
1. Click **⋮** (top-right menu)
2. Select **Restore Disk Image**
3. Choose MiniOS ISO
4. Click **Start Restoring**
5. Enter password
6. Wait for completion

### Using Startup Disk Creator (Ubuntu)

```bash
# Launch
usb-creator-gtk

# Or from terminal:
sudo usb-creator-gtk
```

1. Source: Select MiniOS ISO
2. Disk: Select USB drive
3. Click **Make Startup Disk**

### Using Popsicle (System76)

```bash
# Install
sudo apt install popsicle-gtk

# Launch
popsicle-gtk
```

Modern, simple GUI for writing ISOs.

## Verification

### Verify Write was Successful

**Linux/macOS:**

```bash
# Compare checksums
md5sum minios-standard.iso
sudo md5sum /dev/sdb

# Or use SHA256
sha256sum minios-standard.iso
sudo dd if=/dev/sdb bs=4M count=$(stat -c%s minios-standard.iso | awk '{print int($1/4194304)+1}') | sha256sum
```

**Windows:**
- Use Rufus's built-in verification
- Or download HashTab for checksums

### Test Boot (Optional)

Test in virtual machine before real hardware:

**VirtualBox:**
1. Create new VM
2. Settings → USB
3. Add USB filter for your drive
4. Boot from USB

**QEMU:**

```bash
qemu-system-x86_64 -enable-kvm -m 2048 -usb -device usb-host,hostbus=X,hostaddr=Y
```

## Troubleshooting

### USB Not Bootable

**Cause:** Secure Boot enabled

**Solution:**
1. Enter BIOS (F2/Del during boot)
2. Disable Secure Boot
3. Save and restart

### BIOS Doesn't See USB

**Solutions:**
1. Try different USB port (USB 2.0 sometimes more compatible)
2. Re-create with different tool (try DD Image mode in Rufus)
3. Update BIOS firmware

### "Operating System Not Found"

**Cause:** Incorrect partition scheme

**Solution:**
- MBR for older computers (BIOS)
- GPT for newer computers (UEFI)
- Or use hybrid mode

### Write Fails

**Possible causes:**
1. **Bad USB drive** - Try different drive
2. **Corrupted ISO** - Re-download and verify checksum
3. **Insufficient permissions** - Use sudo/admin rights
4. **USB write-protected** - Check physical lock switch

### Slow Performance

**Cause:** USB 2.0 drive

**Solution:**
- Use USB 3.0+ drive
- Check connection in USB 3.0 port (blue port)

```bash
# Verify USB speed (Linux)
lsusb -t | grep -i "480M\|5000M"

# 480M = USB 2.0 (slow)
# 5000M = USB 3.0 (good)
# 10000M = USB 3.1 (excellent)
```

## Best Practices

### Choosing USB Drives

**Recommended brands:**
- SanDisk Extreme/Ultra
- Samsung BAR Plus
- Kingston DataTraveler
- Transcend JetFlash

**Specifications:**
- Minimum: USB 3.0, 32GB, 100MB/s read
- Recommended: USB 3.1, 64GB, 200MB/s read
- Best: USB 3.2, 128GB, 400MB/s read

### USB Care

**Extend USB lifespan:**
1. Enable persistence (reduces writes)
2. Use browser cache in RAM
3. Disable swap (or use ZRAM)
4. Properly eject before removing

```bash
# Check USB health
sudo smartctl -a /dev/sdb

# Monitor write operations
iotop -o
```

## Multiple USB Setup

### Dedicated Drives

**Recommended setup:**
- **USB 1**: MiniOS Standard (everyday use)
- **USB 2**: MiniOS Puzzle (customization)
- **USB 3**: Recovery tools (emergency)

### Ventoy Multi-Boot

One USB with multiple ISOs:

```
/ventoy/
  ├── minios-standard.iso
  ├── minios-puzzle.iso
  ├── ubuntu-22.04.iso
  ├── memtest86.iso
  └── gparted-live.iso
```

Boot and choose which to run!

## Advanced: Persistence Setup

After creating bootable USB, add persistence:

```bash
# Boot MiniOS
# Open terminal
sudo minios-persistence create

# Choose size (e.g., 16GB)
# Choose encryption (recommended)
```

Now changes persist between reboots!

## Platform-Specific Tips

### Windows 11

May need to disable:
- TPM requirement
- Secure Boot
- Fast Boot

### macOS (Intel Macs)

Hold **Option** during boot to select USB

### macOS (M1/M2 Macs)

M1/M2 Macs cannot boot x86 Linux from USB. Use:
- UTM virtual machine
- Parallels Desktop
- Docker (for containerized Linux)

### Chromebooks

1. Enable Developer Mode
2. Enable USB boot with crossystem
3. Use Ctrl+U at boot screen

## Quick Reference

| Platform | Recommended Tool | Time |
|----------|-----------------|------|
| Windows | Rufus | 5-10 min |
| macOS | balenaEtcher | 5-10 min |
| Linux | dd or GNOME Disks | 5-15 min |
| Multi-boot | Ventoy | 3 min + ISO copy |

## Next Steps

After creating bootable USB:

1. **Test boot** in VM (optional)
2. **Backup important data** on target computer
3. **Boot from USB** (see BIOS boot menu key)
4. **Try MiniOS** without installing
5. **Enable persistence** for permanent changes
6. **Customize** your perfect setup

## Need Help?

Common boot menu keys:
- **F12** - Most Dell, Lenovo, Toshiba
- **F9** - HP
- **F8** - ASUS
- **F11** - MSI
- **Option** - Mac
- **Esc** - Some older systems

Still stuck? Join our [Telegram community](https://t.me/minios_chat) for instant help!

---

*Ready to boot? Check out our [Getting Started Guide](./getting-started.md) next!*
