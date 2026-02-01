---
title: "MiniOS Architecture: How It Works"
excerpt: "Deep dive into MiniOS architecture with diagrams explaining the boot process, module system, and persistence mechanisms."
author: "MiniOS Team"
publishedAt: "2026-01-27T10:00:00.000Z"
tags:
  - technical
  - architecture
  - internals
featuredImage: ""
published: true
order: 2
---

# MiniOS Architecture: How It Works

Understanding how MiniOS works under the hood can help you troubleshoot issues, customize your system, and contribute to the project. This article explains the core architecture using diagrams.

## Boot Process Overview

The MiniOS boot process is designed for speed and flexibility. Here's how it works:

```mermaid
flowchart TD
    A[BIOS/UEFI] --> B[Bootloader<br/>GRUB/Syslinux]
    B --> C[Linux Kernel]
    C --> D[initramfs]
    D --> E{Find MiniOS<br/>Device}
    E -->|Found| F[Mount Base System]
    E -->|Not Found| G[Error: No Device]
    F --> H[Load Modules]
    H --> I[Apply Persistence]
    I --> J[Start Services]
    J --> K[Login Manager]
    K --> L[Desktop Environment]
    
    style A fill:#2d3748,stroke:#4a5568,color:#fff
    style L fill:#38a169,stroke:#2f855a,color:#fff
    style G fill:#e53e3e,stroke:#c53030,color:#fff
```

## Module System

MiniOS uses a layered module system based on SquashFS and OverlayFS:

```mermaid
graph TB
    subgraph Layers["Layered Filesystem"]
        A["Layer 4: User Changes (writable)"]
        B["Layer 3: Extra Modules (.sb files)"]
        C["Layer 2: Desktop Module"]
        D["Layer 1: Base System (core.sb)"]
    end
    
    A --> E[OverlayFS]
    B --> E
    C --> E
    D --> E
    E --> F["Root Filesystem"]
    
    style A fill:#48bb78,stroke:#38a169,color:#fff
    style B fill:#4299e1,stroke:#3182ce,color:#fff
    style C fill:#805ad5,stroke:#6b46c1,color:#fff
    style D fill:#ed8936,stroke:#dd6b20,color:#fff
    style F fill:#2d3748,stroke:#4a5568,color:#fff
```

### Module Types

| Type | Extension | Purpose | Location |
|------|-----------|---------|----------|
| Core | `.sb` | Base system | `/minios/base/` |
| Optional | `.sb` | Extra software | `/minios/modules/` |
| Changes | dir | User modifications | `/minios/changes/` |

## Persistence Modes

MiniOS supports multiple persistence modes for different use cases:

```mermaid
flowchart LR
    subgraph "Boot Parameter"
        A[perch=]
    end
    
    A -->|askdisk| B[Select disk on boot]
    A -->|device:path| C[Specific location]
    A -->|none| D[No persistence]
    
    B --> E[Changes saved]
    C --> E
    D --> F[RAM only]
    
    style E fill:#38a169,stroke:#2f855a,color:#fff
    style F fill:#e53e3e,stroke:#c53030,color:#fff
```

### Persistence Options Comparison

| Mode | Speed | Persistence | USB Safe | Use Case |
|------|-------|-------------|----------|----------|
| RAM Only | ⚡⚡⚡ | ❌ | ✅ | Testing, Kiosk |
| Native | ⚡⚡ | ✅ | ⚠️ | Fixed installation |
| Changes Dir | ⚡⚡ | ✅ | ✅ | USB with changes |
| Encrypted | ⚡ | ✅ | ✅ | Secure portable |

## Network Configuration Flow

```mermaid
sequenceDiagram
    participant User
    participant NetworkManager
    participant DHCP
    participant DNS
    
    User->>NetworkManager: Connect to network
    NetworkManager->>NetworkManager: Detect interface
    NetworkManager->>DHCP: Request IP address
    DHCP-->>NetworkManager: IP + Gateway + DNS
    NetworkManager->>DNS: Test resolution
    DNS-->>NetworkManager: OK
    NetworkManager-->>User: Connected
```

## System Services Architecture

```mermaid
graph TD
    subgraph "Init System"
        A[systemd / OpenRC]
    end
    
    subgraph "Core Services"
        B[udev]
        C[dbus]
        D[NetworkManager]
    end
    
    subgraph "User Services"
        E[Display Manager]
        F[PulseAudio]
        G[PolicyKit]
    end
    
    subgraph "Applications"
        H[File Manager]
        I[Web Browser]
        J[Terminal]
    end
    
    A --> B
    A --> C
    A --> D
    C --> E
    C --> F
    C --> G
    E --> H
    E --> I
    E --> J
    
    style A fill:#2d3748,stroke:#4a5568,color:#fff
```

## USB Boot Architecture

When booting from USB, MiniOS uses a special detection mechanism:

```mermaid
flowchart TD
    A[Boot starts] --> B{Check /dev/disk/by-label}
    B -->|MINIOS found| C[Use labeled device]
    B -->|Not found| D{Scan all devices}
    D --> E{Found minios dir?}
    E -->|Yes| F[Use this device]
    E -->|No| G{More devices?}
    G -->|Yes| D
    G -->|No| H[Boot failure]
    C --> I[Continue boot]
    F --> I
    
    style H fill:#e53e3e,stroke:#c53030,color:#fff
    style I fill:#38a169,stroke:#2f855a,color:#fff
```

## Memory Layout

| Region | Purpose | Typical Size |
|--------|---------|--------------|
| Kernel | Linux kernel | 10-15 MB |
| Modules | Kernel modules | 50-100 MB |
| Initramfs | Boot environment | 30-50 MB |
| SquashFS Cache | Decompressed blocks | Dynamic |
| OverlayFS | File changes | Dynamic |
| Applications | Running programs | Variable |

## Conclusion

MiniOS's architecture is designed for:
- **Speed**: SquashFS compression with fast decompression
- **Portability**: Works from any bootable device
- **Flexibility**: Modular design allows customization
- **Reliability**: Read-only base system prevents corruption

Understanding these concepts will help you:
- Troubleshoot boot issues
- Create custom modules
- Optimize for your use case
- Contribute to MiniOS development

---

*Have questions about MiniOS internals? Check our [GitHub](https://github.com/minios-linux/minios-live) or ask in [Telegram](https://t.me/minios_chat)!*
