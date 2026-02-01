---
title: Customizing MiniOS - Make It Your Own
excerpt: >-
  Transform your MiniOS installation with themes, icons, and custom
  configurations. A complete guide to personalization.
author: MiniOS Team
publishedAt: '2026-01-20T14:30:00.000Z'
updatedAt: '2026-01-31T23:43:47.541Z'
tags:
  - customization
  - tutorial
  - themes
published: true
---

MiniOS gives you complete control over your desktop environment. Here's how to make it truly yours.

## Desktop Environment Customization

### Changing Themes

MiniOS supports multiple theme engines:

```bash
# Install theme manager
sudo apt update
sudo apt install lxappearance

# Launch theme manager
lxappearance
```

**Popular themes:**
- **Arc** - Modern flat theme
- **Adapta** - Material Design inspired
- **Numix** - Clean and minimal
- **Gruvbox** - Retro warm colors

### Icon Packs

```bash
# Install popular icon packs
sudo apt install papirus-icon-theme
sudo apt install numix-icon-theme
sudo apt install moka-icon-theme

# Apply via lxappearance
lxappearance
```

## Window Manager Tweaks

### Openbox Configuration

MiniOS uses Openbox as its window manager. Customize it:

```bash
# Edit Openbox config
nano ~/.config/openbox/rc.xml

# Edit menu
nano ~/.config/openbox/menu.xml

# Reload configuration
openbox --reconfigure
```

**Example: Custom keybindings**

```xml
<keybind key="W-t">
  <action name="Execute">
    <command>xfce4-terminal</command>
  </action>
</keybind>

<keybind key="W-f">
  <action name="Execute">
    <command>pcmanfm</command>
  </action>
</keybind>
```

### Tint2 Panel

Customize your panel appearance:

```bash
# Edit tint2 configuration
nano ~/.config/tint2/tint2rc

# Multiple panel configs
tint2conf  # GUI configuration tool
```

## Conky System Monitor

Add beautiful system monitoring to your desktop:

```bash
# Install Conky
sudo apt install conky-all

# Create config
mkdir -p ~/.config/conky
nano ~/.config/conky/conky.conf
```

**Example Conky config:**

```lua
conky.config = {
    alignment = 'top_right',
    background = true,
    border_width = 1,
    cpu_avg_samples = 2,
    default_color = 'white',
    default_outline_color = 'white',
    default_shade_color = 'white',
    double_buffer = true,
    draw_borders = false,
    draw_graph_borders = true,
    draw_outline = false,
    draw_shades = false,
    gap_x = 20,
    gap_y = 60,
    minimum_height = 5,
    minimum_width = 5,
    net_avg_samples = 2,
    no_buffers = true,
    out_to_console = false,
    out_to_stderr = false,
    extra_newline = false,
    own_window = true,
    own_window_class = 'Conky',
    own_window_type = 'desktop',
    own_window_transparent = true,
    stippled_borders = 0,
    update_interval = 1.0,
    uppercase = false,
    use_spacer = 'none',
    use_xft = true,
    font = 'DejaVu Sans Mono:size=10',
}

conky.text = [[
${color grey}System Info:$color
$nodename $sysname $kernel
$hr
${color grey}Uptime:$color $uptime
${color grey}RAM Usage:$color $mem/$memmax - $memperc%
${membar 4}
${color grey}CPU Usage:$color $cpu%
${cpubar 4}
${color grey}Processes:$color $processes  ${color grey}Running:$color $running_processes
$hr
${color grey}File systems:
 / $color${fs_used /}/${fs_size /} ${fs_bar 6 /}
]]
```

## Wallpapers and Backgrounds

```bash
# Set wallpaper with nitrogen
sudo apt install nitrogen

# GUI wallpaper picker
nitrogen

# Or use feh
feh --bg-scale /path/to/wallpaper.jpg
```

**Auto-change wallpapers:**

```bash
# Install variety
sudo apt install variety

# Launch variety
variety
```

## Custom Boot Splash

Customize the boot screen:

```bash
# Install Plymouth themes
sudo apt install plymouth-themes

# List available themes
plymouth-set-default-theme --list

# Set theme
sudo plymouth-set-default-theme solar
sudo update-initramfs -u
```

## Cursor Themes

```bash
# Install cursor themes
sudo apt install breeze-cursor-theme
sudo apt install dmz-cursor-theme

# Apply via lxappearance
lxappearance
```

## Fonts

```bash
# Install additional fonts
sudo apt install fonts-roboto
sudo apt install fonts-firacode
sudo apt install fonts-noto

# Rebuild font cache
fc-cache -fv
```

## Terminal Customization

### Colorize Your Terminal

```bash
# Edit .bashrc
nano ~/.bashrc

# Add custom prompt
export PS1='\[\e[1;32m\]\u@\h\[\e[0m\]:\[\e[1;34m\]\w\[\e[0m\]\$ '

# Source changes
source ~/.bashrc
```

### Tmux Configuration

```bash
# Create tmux config
nano ~/.tmux.conf
```

**Example tmux config:**

```bash
# Better prefix
unbind C-b
set-option -g prefix C-a
bind-key C-a send-prefix

# Split panes with | and -
bind | split-window -h
bind - split-window -v

# Enable mouse
set -g mouse on

# Status bar
set -g status-bg black
set -g status-fg white
```

## Application Launchers

### Rofi

Replace default application menu with Rofi:

```bash
# Install rofi
sudo apt install rofi

# Launch rofi
rofi -show drun

# Bind to keyboard (add to rc.xml)
# Super+Space = rofi -show drun
```

**Rofi themes:**

```bash
# Browse themes
rofi-theme-selector

# Custom theme location
~/.config/rofi/config.rasi
```

## Compositing Effects

Add transparency and shadows:

```bash
# Install picom (compositor)
sudo apt install picom

# Create config
mkdir -p ~/.config/picom
nano ~/.config/picom/picom.conf
```

**Basic picom config:**

```conf
# Shadows
shadow = true;
shadow-radius = 12;
shadow-offset-x = -5;
shadow-offset-y = -5;
shadow-opacity = 0.5;

# Opacity
inactive-opacity = 0.95;
active-opacity = 1.0;
frame-opacity = 1.0;

# Fading
fading = true;
fade-delta = 5;

# Backend
backend = "glx";
vsync = true;
```

## Save Your Customizations

Make your changes persistent:

```bash
# Create persistence if not already
sudo minios-persistence create

# All config files in ~/.config/ will persist automatically
```

## Preset Configurations

We've created some preset configurations you can download:

1. **Minimal Dark** - Clean dark theme, minimal panel
2. **Retro Terminal** - Green-on-black terminal aesthetic
3. **Material Design** - Modern material design theme
4. **Gruvbox Complete** - Full Gruvbox theme ecosystem

Download from our [GitHub repository](https://github.com/minios-linux/themes).

## Sharing Your Setup

Created an amazing setup? Share it!

1. Take screenshots with `scrot` or `flameshot`
2. Export your configs: `tar -czf my-configs.tar.gz ~/.config/`
3. Share in our [Telegram Community](https://t.me/minios_chat)

---

*Show us your MiniOS setup! We feature the best customizations in our monthly showcase.*
