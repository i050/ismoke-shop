import React from 'react';
import BannerManagement from '../../../components/features/admin/BannerManagement';
import styles from './BannersPage.module.css';

const BannersPage: React.FC = () => {
  return (
    <div className={styles.bannersPage}>
      <BannerManagement />
    </div>
  );
};

export default BannersPage;
