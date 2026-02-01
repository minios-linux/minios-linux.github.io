import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useContent } from '@/hooks/use-local-data';
import { DynamicIcon } from './DynamicIcon';
import type { Feature } from '@/lib/types';

// Default features for fallback
const defaultFeatures: Feature[] = [
  {
    id: 'live-boot',
    icon: 'Rocket',
    title: 'Live Boot System',
    description: 'Works on virtually any x86-64 computer. Your OS travels with you.',
    bulletPoints: ['UEFI & Legacy BIOS support', 'Wide hardware compatibility', 'No installation required'],
    order: 0
  },
  {
    id: 'ram-boot',
    icon: 'Gauge',
    title: 'Lightning Fast RAM Boot',
    description: 'Runs entirely from RAM for blazing-fast performance. No disk bottlenecks, instant application launches.',
    bulletPoints: ['Zero boot delays after loading', 'Instant application response', 'No HDD/SSD wear during use'],
    order: 1
  },
  {
    id: 'persistence',
    icon: 'Usb',
    title: 'USB Persistence',
    description: 'Your personal portable OS. Everything saves automatically to your USB drive.',
    bulletPoints: ['Files & documents persist', 'WiFi & network settings saved', 'Installed apps stay with you'],
    order: 2
  },
  {
    id: 'debian',
    icon: 'Server',
    title: 'Debian Foundation',
    description: 'Built on Debian Stable foundation. Enterprise reliability meets desktop usability.',
    bulletPoints: ['70,000+ packages available', 'Regular security updates', 'Battle-tested stability'],
    order: 3
  },
  {
    id: 'xfce',
    icon: 'Monitor',
    title: 'XFCE Desktop',
    description: 'Modern, beautiful XFCE desktop that\'s both elegant and efficient.',
    bulletPoints: ['Customizable themes', 'Smooth animations', 'Low resource usage'],
    order: 4
  },
  {
    id: 'modular',
    icon: 'PackageOpen',
    title: 'Modular Architecture',
    description: 'Extend system with SquashFS modules. Load only what you need, keep it lightweight and flexible.',
    bulletPoints: ['SquashFS .sb modules', 'Add software on demand', 'Create custom modules'],
    order: 5
  }
];

const Features: React.FC = () => {
  const { t } = useTranslation();
  const [content, , loading] = useContent();

  // Use loaded features or defaults
  const features = content.features?.length > 0 ? content.features : defaultFeatures;
  const displayFeatures = [...features].sort((a, b) => a.order - b.order);

  if (loading) {
    return null;
  }

  return (
    <section id="features">
      <div className="container">
        <div className="section-header">
          <h2>{t(content.homePage.features.sectionTitle)}</h2>
          <p className="text-muted">{t(content.homePage.features.sectionSubtitle)}</p>
        </div>
        <div className="grid-3">
          {displayFeatures.map((feature: Feature) => (
            <div key={feature.id} className="feature-wrapper">
              <div className="feature-card">
                <DynamicIcon name={feature.icon} className="f-icon" />
                <h3>{t(feature.title)}</h3>
                <p className="feature-desc">{t(feature.description)}</p>
                <ul className="feature-list">
                  {feature.bulletPoints.map((item: string, i: number) => (
                    <li key={i}>{t(item)}</li>
                  ))}
                </ul>
              </div>
              {/* Spacer for hover effect */}
              <div className="feature-card spacer">
                <DynamicIcon name={feature.icon} className="f-icon" />
                <h3>{t(feature.title)}</h3>
                <p className="feature-desc">{t(feature.description)}</p>
                <ul className="feature-list">
                  {feature.bulletPoints.map((item: string, i: number) => (
                    <li key={i}>{t(item)}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
