---
title: Security Best Practices for MiniOS
excerpt: Protect your data and privacy with these essential security measures. A comprehensive guide to keeping your MiniOS system secure.
author: MiniOS Team
publishedAt: '2026-01-05T08:00:00.000Z'
updatedAt: '2026-01-05T08:00:00.000Z'
tags:
  - security
  - privacy
  - guide
featuredImage: /assets/img/standard_00.jpg
published: true
---

Security should be a priority for every MiniOS user. Follow these best practices to keep your system and data safe.

## Boot Security

### BIOS/UEFI Protection

**Set BIOS password:**
1. Enter BIOS (F2/Del during boot)
2. Navigate to Security settings
3. Set Supervisor Password
4. Set Boot Password
5. Save and exit

**Disable unnecessary boot devices:**
- Only enable USB boot when needed
- Set hard drive as primary
- Disable network boot (PXE) unless required

### Secure Boot

```bash
# Check Secure Boot status
mokutil --sb-state

# For maximum compatibility, MiniOS runs with Secure Boot disabled
# For high security environments, consider enabling it
```

## Encryption

### Full Disk Encryption

**For persistent installations:**

```bash
# Enable encryption during persistence creation
sudo minios-persistence create --encrypted

# Strong passphrase requirements:
# - Minimum 20 characters
# - Mix of uppercase, lowercase, numbers, symbols
# - Avoid dictionary words
# - Use passphrase generator
```

**Generate strong passphrase:**

```bash
# Install pwgen
sudo apt install pwgen

# Generate strong passphrase
pwgen -s 32 1

# Or use diceware method
shuf -n 6 /usr/share/dict/words | tr '\n' '-'
```

### File Encryption

**Encrypt individual files:**

```bash
# Install GPG
sudo apt install gnupg

# Encrypt file
gpg -c sensitive-file.pdf

# Decrypt file
gpg sensitive-file.pdf.gpg
```

**Encrypted containers with VeraCrypt:**

```bash
# Install VeraCrypt
sudo apt install veracrypt

# Create encrypted container
veracrypt -t -c

# Mount container
veracrypt /path/to/container /mnt/encrypted
```

## Network Security

### Firewall Setup

```bash
# Install UFW (Uncomplicated Firewall)
sudo apt install ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow specific services
sudo ufw allow ssh
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### VPN Configuration

**OpenVPN setup:**

```bash
# Install OpenVPN
sudo apt install openvpn

# Copy your config
sudo cp your-vpn.ovpn /etc/openvpn/client.conf

# Enable on boot
sudo systemctl enable openvpn@client

# Start VPN
sudo systemctl start openvpn@client

# Verify connection
curl ifconfig.me
```

**Kill switch (prevent leaks if VPN drops):**

```bash
# UFW-based kill switch
sudo ufw default deny outgoing
sudo ufw allow out on tun0
sudo ufw allow out to your.vpn.server port 1194
```

### DNS Security

**Use encrypted DNS:**

```bash
# Install DNSCrypt
sudo apt install dnscrypt-proxy

# Configure
sudo nano /etc/dnscrypt-proxy/dnscrypt-proxy.toml
```

**Example config:**

```toml
server_names = ['cloudflare', 'quad9-dnscrypt-ip4-nofilter-pri']
listen_addresses = ['127.0.0.1:53']
require_dnssec = true
require_nolog = true
require_nofilter = true
```

## Application Security

### Browser Hardening

**Firefox security settings:**

1. **Privacy settings:**
   - Enhanced Tracking Protection: Strict
   - Send "Do Not Track": Always
   - Cookies: Delete on close
   - History: Never remember

2. **Install security extensions:**
   - uBlock Origin (ad blocking)
   - HTTPS Everywhere
   - Privacy Badger
   - Cookie AutoDelete

3. **about:config tweaks:**

```
privacy.resistFingerprinting = true
privacy.trackingprotection.enabled = true
network.cookie.cookieBehavior = 1
network.cookie.lifetimePolicy = 2
geo.enabled = false
media.peerconnection.enabled = false
```

### Email Security

**GPG email encryption:**

```bash
# Generate GPG key
gpg --full-generate-key

# List keys
gpg --list-keys

# Export public key
gpg --export -a "Your Name" > public-key.asc

# Import contact's public key
gpg --import their-key.asc

# Encrypt email
gpg -e -r "recipient@email.com" message.txt

# Decrypt email
gpg -d encrypted-message.gpg
```

## System Hardening

### Disable Unnecessary Services

```bash
# List running services
systemctl list-units --type=service --state=running

# Disable unneeded services
sudo systemctl disable bluetooth.service
sudo systemctl disable cups.service
sudo systemctl disable avahi-daemon.service
```

### Automatic Updates

```bash
# Install unattended upgrades
sudo apt install unattended-upgrades

# Configure
sudo dpkg-reconfigure -plow unattended-upgrades

# Enable automatic security updates
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

**Recommended config:**

```
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
```

### File Permissions

**Secure sensitive files:**

```bash
# SSH keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# GPG directory
chmod 700 ~/.gnupg

# Password files
chmod 600 ~/.password-store/*
```

## Password Management

### Use a Password Manager

**KeePassXC (recommended):**

```bash
# Install
sudo apt install keepassxc

# Features:
# - Encrypted database
# - Password generator
# - Browser integration
# - TOTP support
# - No cloud dependency
```

**Best practices:**
- Unique password for every service
- Minimum 16 characters
- Use password generator
- Enable 2FA where available
- Backup encrypted database

## Privacy Protection

### Browser Fingerprinting Protection

```bash
# Install Tor Browser for maximum anonymity
sudo apt install torbrowser-launcher

# Or configure Firefox with:
# - Privacy Badger
# - NoScript
# - Canvas Blocker
```

### MAC Address Randomization

```bash
# Install macchanger
sudo apt install macchanger

# Randomize MAC address
sudo macchanger -r wlan0

# Auto-randomize on boot
sudo nano /etc/systemd/system/macchanger.service
```

**Service file:**

```ini
[Unit]
Description=MAC Address Randomization
Wants=network-pre.target
Before=network-pre.target

[Service]
Type=oneshot
ExecStart=/usr/bin/macchanger -r wlan0

[Install]
WantedBy=multi-user.target
```

### Metadata Removal

```bash
# Install MAT2 (Metadata Anonymisation Toolkit)
sudo apt install mat2

# Remove metadata from files
mat2 document.pdf
mat2 photo.jpg

# Check metadata
mat2 --show document.pdf
```

## USB Security

### Disable USB Storage

**Prevent unauthorized data exfiltration:**

```bash
# Blacklist USB storage
echo "blacklist usb_storage" | sudo tee /etc/modprobe.d/blacklist-usb.conf

# Unload module
sudo modprobe -r usb_storage

# USB keyboards/mice still work
```

### USB Write Protection

```bash
# Remount USB as read-only
sudo mount -o remount,ro /dev/sdb1

# Or enable USBGuard
sudo apt install usbguard
sudo usbguard generate-policy > /etc/usbguard/rules.conf
sudo systemctl enable usbguard
```

## Secure Deletion

### Shred Files

```bash
# Securely delete file
shred -vfz -n 10 sensitive-file.txt

# Wipe free space
sudo dd if=/dev/zero of=/tmp/zero.file bs=1M
sudo rm /tmp/zero.file

# Or use scrub
sudo apt install scrub
sudo scrub -p dod /dev/sdX
```

## Audit and Monitoring

### System Logs

```bash
# Monitor authentication attempts
sudo tail -f /var/log/auth.log

# Check for failed logins
sudo lastb

# Successful logins
last

# Current users
w
```

### Intrusion Detection

```bash
# Install AIDE (Advanced Intrusion Detection Environment)
sudo apt install aide

# Initialize database
sudo aideinit

# Check for changes
sudo aide --check
```

### Port Scanning

```bash
# Check open ports
sudo netstat -tulpn

# Or use ss
sudo ss -tulpn

# Scan for vulnerabilities
sudo apt install nmap
nmap -sV localhost
```

## Incident Response

### What to do if compromised:

1. **Disconnect from network immediately**
2. **Document everything** (screenshots, timestamps)
3. **Don't shut down** (preserves RAM evidence)
4. **Create disk image:**

```bash
sudo dd if=/dev/sda of=/external/disk-image.img bs=4M status=progress
```

5. **Change all passwords** (from different device)
6. **Review logs:**

```bash
sudo journalctl -xe
sudo cat /var/log/auth.log
sudo cat /var/log/syslog
```

## Security Checklist

**Essential:**
- [ ] BIOS password set
- [ ] Persistence encrypted
- [ ] Firewall enabled
- [ ] VPN configured
- [ ] Automatic security updates
- [ ] Password manager in use
- [ ] Browser hardened
- [ ] Regular backups

**Advanced:**
- [ ] Full disk encryption
- [ ] MAC randomization
- [ ] DNS encryption
- [ ] GPG email encryption
- [ ] USB storage disabled
- [ ] Intrusion detection
- [ ] Log monitoring
- [ ] Kill switch configured

## Resources

**Tools:**
- [VeraCrypt](https://www.veracrypt.fr/) - Disk encryption
- [KeePassXC](https://keepassxc.org/) - Password manager
- [Tor Browser](https://www.torproject.org/) - Anonymous browsing
- [GPG](https://gnupg.org/) - Email encryption

**Learning:**
- OWASP Security Guidelines
- EFF Surveillance Self-Defense
- PrivacyTools.io
- MiniOS Security Wiki

---

*Security is an ongoing process. Stay informed, stay secure. Questions? Ask in [Telegram](https://t.me/minios_chat).*
