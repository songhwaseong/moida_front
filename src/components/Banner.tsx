import React from 'react';
import styles from './Banner.module.css';

interface BannerProps {
  title: string;
  subtitle: string;
  cta: string;
  onClick?: () => void;
}

const Banner: React.FC<BannerProps> = ({ title, subtitle, cta, onClick }) => {
  return (
    <div className={styles.section}>
      <div className={styles.banner} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
        <div className={styles.text}>
          <h3>
            {title.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </h3>
          <p>{subtitle}</p>
        </div>
        <button className={styles.badge} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>{cta}</button>
      </div>
    </div>
  );
};

export default Banner;
