---
title: Backup and Recovery Strategies for MiniOS
excerpt: Protect your data and system with comprehensive backup strategies. From simple file backups to full system recovery.
author: MiniOS Team
publishedAt: '2026-01-03T13:00:00.000Z'
updatedAt: '2026-01-03T13:00:00.000Z'
tags:
  - backup
  - recovery
  - tutorial
  - data-protection
featuredImage: /assets/img/standard_00.jpg
published: true
---

Data loss happens. Hardware fails. Mistakes are made. Having a solid backup strategy is essential. Here's how to protect your MiniOS system and data.

## Understanding MiniOS Storage

### Storage Components

```
MiniOS USB Drive:
├── Boot Partition (FAT32)
│   ├── bootloader
│   ├── kernel
│   └── initramfs
├── System Partition (SquashFS)
│   └── minios.sb (compressed read-only)
└── Persistence Partition (EXT4/LUKS)
    ├── /changes (overlay filesystem)
    └── /home (user data)
```

**What needs backup:**
- ✓ Persistence partition (your changes)
- ✓ Home directory (your files)
- ? Configuration files (optional, recreatable)
- ✗ System partition (read-only, can re-download)

## Backup Strategies

### Strategy 1: File-Level Backup (Simple)

**Best for:** Documents, photos, important files

**Tools:** rsync, Déjà Dup, Timeshift

#### Using rsync

```bash
# Backup home directory to external drive
rsync -avh --progress \
    ~/Documents \
    ~/Pictures \
    ~/Projects \
    /media/backup/minios-backup/

# Add --delete to mirror (remove deleted files)
rsync -avh --delete --progress \
    ~/ \
    /media/backup/home-mirror/
```

**Advantages:**
- Fast, incremental backups
- Only changed files copied
- Works on any Linux system

**Automation:**

```bash
# Create backup script
cat > ~/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/media/backup/minios-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

rsync -avh --progress \
    --exclude='.cache' \
    --exclude='Downloads' \
    ~/Documents \
    ~/Pictures \
    ~/Projects \
    "$BACKUP_DIR/"

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x ~/backup.sh

# Run daily (add to cron)
crontab -e
# Add: 0 2 * * * /home/user/backup.sh
```

### Strategy 2: System Image (Complete)

**Best for:** Full system recovery

**Tools:** Clonezilla, dd, Partclone

#### Using Clonezilla

**1. Download Clonezilla Live:**
```bash
wget https://downloads.sourceforge.net/clonezilla/clonezilla-live-*.iso
```

**2. Create bootable USB:**
```bash
sudo dd if=clonezilla-live.iso of=/dev/sdc bs=4M status=progress
```

**3. Boot Clonezilla and select:**
- device-device: Clone to another USB
- device-image: Save image to external drive

**4. Follow wizard:**
- Select source (MiniOS USB)
- Select destination
- Choose "savedisk" mode
- Complete backup

**Restore:**
- Boot Clonezilla
- Select "restoredisk"
- Choose image
- Select target drive

#### Using dd (Advanced)

```bash
# Backup entire USB drive
sudo dd if=/dev/sdb of=/media/backup/minios-full.img bs=4M status=progress

# Compress to save space
sudo dd if=/dev/sdb bs=4M status=progress | gzip > /media/backup/minios-full.img.gz

# Restore
sudo gunzip -c /media/backup/minios-full.img.gz | sudo dd of=/dev/sdb bs=4M status=progress
```

**Warnings:**
- ⚠️ Double-check device names!
- ⚠️ Wrong device = data loss
- ⚠️ Ensure sufficient space

### Strategy 3: Persistence Backup (Hybrid)

**Best for:** Quick recovery while preserving space

**Backup only persistence partition:**

```bash
# Find persistence partition
lsblk -f | grep -i minios

# Backup persistence
sudo dd if=/dev/sdb2 of=/media/backup/persistence.img bs=4M status=progress

# Or mount and rsync
sudo mount /dev/sdb2 /mnt
sudo rsync -avh /mnt/ /media/backup/persistence-files/
sudo umount /mnt
```

**Advantages:**
- Smaller backup size
- Faster backup/restore
- System can be re-downloaded

## Cloud Backup Solutions

### Using rclone

**1. Install rclone:**
```bash
sudo apt install rclone
```

**2. Configure cloud storage:**
```bash
rclone config

# Follow prompts to add:
# - Google Drive
# - Dropbox
# - OneDrive
# - S3-compatible storage
```

**3. Sync to cloud:**
```bash
# Sync documents to Google Drive
rclone sync ~/Documents gdrive:MiniOS-Backup/Documents -P

# Encrypted sync
rclone sync ~/Documents gdrive:MiniOS-Backup/Documents --crypt-remote=encrypted: -P
```

**Automated cloud backup:**

```bash
cat > ~/cloud-backup.sh << 'EOF'
#!/bin/bash
rclone sync ~/Documents gdrive:Backup/Documents -v --log-file=/tmp/rclone.log
rclone sync ~/Pictures gdrive:Backup/Pictures -v --log-file=/tmp/rclone.log
notify-send "Cloud Backup" "Backup completed successfully"
EOF

chmod +x ~/cloud-backup.sh

# Add to crontab
0 3 * * * /home/user/cloud-backup.sh
```

### Using Duplicity

**Encrypted, incremental cloud backups:**

```bash
# Install
sudo apt install duplicity python3-boto3

# Backup to S3
duplicity ~/Documents s3://s3.amazonaws.com/my-backup/documents

# Backup to Google Drive
duplicity ~/Documents gdocs://user@gmail.com/MiniOS-Backup

# Restore
duplicity s3://s3.amazonaws.com/my-backup/documents ~/Documents-Restored
```

## GUI Backup Tools

### Déjà Dup (Easiest)

```bash
# Install
sudo apt install deja-dup

# Launch
deja-dup
```

**Features:**
- Simple interface
- Automatic scheduling
- Encryption support
- Cloud storage integration
- Restore from file manager

**Configuration:**
1. Select folders to backup
2. Choose backup location (USB/Cloud)
3. Set schedule (daily/weekly)
4. Enable encryption
5. First backup starts

### Timeshift (System Snapshots)

```bash
# Install
sudo apt install timeshift

# Launch
sudo timeshift-gtk
```

**Features:**
- BTRFS or rsync snapshots
- Scheduled snapshots
- Boot-time snapshots
- Easy restore

**Setup:**
1. Select snapshot type (rsync)
2. Choose destination
3. Set schedule
4. Select what to include
5. Create first snapshot

**Restore:**
```bash
# List snapshots
sudo timeshift --list

# Restore snapshot
sudo timeshift --restore
```

## Version Control for Configs

### Using Git

**Track configuration files:**

```bash
# Initialize git repo
cd ~
git init

# Create .gitignore
cat > .gitignore << 'EOF'
.cache/
Downloads/
*.log
.local/share/Trash/
EOF

# Track configs
git add .config/
git add .bashrc
git add .vimrc

# Commit
git commit -m "Initial config backup"

# Push to GitHub (optional)
git remote add origin https://github.com/user/dotfiles.git
git push -u origin main
```

**Daily auto-commit:**

```bash
cat > ~/git-backup.sh << 'EOF'
#!/bin/bash
cd ~
git add -A
git commit -m "Auto backup $(date +%Y-%m-%d)"
git push origin main
EOF

# Run daily
0 23 * * * /home/user/git-backup.sh
```

## Recovery Scenarios

### Scenario 1: Deleted File

**Solution: File recovery tools**

```bash
# Install TestDisk/PhotoRec
sudo apt install testdisk

# Run PhotoRec
sudo photorec /dev/sdb2

# Or use extundelete
sudo apt install extundelete
sudo extundelete /dev/sdb2 --restore-file /path/to/file
```

### Scenario 2: Corrupted Persistence

**Solution: Restore from backup**

```bash
# Boot from backup MiniOS USB
# Mount broken USB
sudo mount /dev/sdc2 /mnt/broken

# Check filesystem
sudo fsck -y /dev/sdc2

# If unfixable, restore backup
sudo dd if=/media/backup/persistence.img of=/dev/sdc2 bs=4M status=progress
```

### Scenario 3: USB Drive Failure

**Solution: Clone to new USB**

```bash
# Boot from Clonezilla or another system
# Restore full image to new USB
sudo dd if=/media/backup/minios-full.img.gz | gunzip | sudo dd of=/dev/sdX bs=4M status=progress
```

### Scenario 4: Partial Data Loss

**Solution: Restore specific files**

```bash
# Mount backup
sudo mount /media/backup/persistence.img /mnt/backup

# Copy needed files
cp -r /mnt/backup/home/user/Documents/project ~/Documents/

# Unmount
sudo umount /mnt/backup
```

## Backup Best Practices

### 3-2-1 Rule

**3** copies of data:
- Original (on MiniOS USB)
- Local backup (external HDD)
- Remote backup (cloud)

**2** different media types:
- USB/SSD
- HDD
- Cloud

**1** off-site copy:
- Cloud storage
- Different location

### Backup Schedule

**Recommended:**

```
Daily:    Important work files (cloud sync)
Weekly:   Full home directory (external drive)
Monthly:  Full system image (external drive)
Yearly:   Archive to cold storage
```

### Verification

**Always verify backups:**

```bash
# Compare checksums
md5sum file.txt
md5sum /backup/file.txt

# Or use rsync dry-run
rsync -avcn /source/ /backup/

# Periodically test restore
# Don't wait for emergency!
```

### Automation Script

**Complete backup automation:**

```bash
cat > /usr/local/bin/minios-backup << 'EOF'
#!/bin/bash

BACKUP_ROOT="/media/backup"
DATE=$(date +%Y%m%d)
LOG="/var/log/minios-backup.log"

log() {
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $*" | tee -a "$LOG"
}

# Daily: Files
log "Starting daily file backup"
rsync -avh --delete \
    ~/Documents ~/Pictures ~/Projects \
    "$BACKUP_ROOT/daily/" >> "$LOG" 2>&1

# Weekly: Home
if [ "$(date +%u)" = "7" ]; then
    log "Starting weekly home backup"
    rsync -avh --delete ~/ \
        "$BACKUP_ROOT/weekly/home-$DATE/" >> "$LOG" 2>&1
fi

# Monthly: Persistence
if [ "$(date +%d)" = "01" ]; then
    log "Starting monthly persistence backup"
    sudo dd if=/dev/sdb2 of="$BACKUP_ROOT/monthly/persistence-$DATE.img" \
        bs=4M status=progress >> "$LOG" 2>&1
fi

# Cloud sync
log "Syncing to cloud"
rclone sync ~/Documents gdrive:Backup/Documents -v >> "$LOG" 2>&1

log "Backup completed"
notify-send "MiniOS Backup" "All backups completed successfully"
EOF

chmod +x /usr/local/bin/minios-backup

# Schedule
sudo crontab -e
# 0 2 * * * /usr/local/bin/minios-backup
```

## Emergency Recovery Kit

**Create recovery USB with:**

1. **MiniOS Live USB** - For booting
2. **Clonezilla** - For imaging
3. **TestDisk/PhotoRec** - For file recovery
4. **Your backups** - On external drive

**Using Ventoy:**

```bash
# Install Ventoy on USB
ventoy-install -i /dev/sdX

# Copy ISOs
cp minios.iso /ventoy/
cp clonezilla.iso /ventoy/
cp systemrescue.iso /ventoy/

# Store backups
cp -r /backups /ventoy/data/
```

## Backup Checklist

**Before disaster:**
- [ ] Automated daily backups configured
- [ ] Weekly full backups running
- [ ] Cloud sync enabled
- [ ] Backups tested (restore verification)
- [ ] Recovery USB created
- [ ] Backup documentation written

**After disaster:**
- [ ] Don't panic
- [ ] Stop using affected drive
- [ ] Boot from recovery USB
- [ ] Assess damage
- [ ] Restore from most recent backup
- [ ] Verify restored data
- [ ] Resume regular backups

## Resources

**Tools:**
- [Clonezilla](https://clonezilla.org/) - Disk imaging
- [TestDisk](https://www.cgsecurity.org/wiki/TestDisk) - File recovery
- [rclone](https://rclone.org/) - Cloud sync
- [Duplicity](http://duplicity.nongnu.org/) - Encrypted backups

**Reading:**
- [Arch Wiki: System Backup](https://wiki.archlinux.org/title/System_backup)
- [Tao of Backup](http://www.taobackup.com/)

---

*Don't wait for disaster. Start backing up today! Questions? Ask in [Telegram](https://t.me/minios_chat).*
