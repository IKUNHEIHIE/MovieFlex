'use client';

import { ConfigProvider, theme } from 'antd';
import type React from 'react';

const movieFlexToken = {
  colorPrimary: '#3a8bbf',
  colorInfo: '#3a8bbf',
  colorSuccess: '#278a66',
  colorWarning: '#bc7824',
  colorError: '#d95252',
  colorBgLayout: '#edf5f8',
  colorBgContainer: '#ffffff',
  colorBorder: '#d4e8f2',
  colorBorderSecondary: '#c9d7e0',
  colorText: '#1c3039',
  colorTextSecondary: '#5e6d69',
  colorTextTertiary: '#7a827a',
  borderRadius: 8,
  borderRadiusLG: 12,
  borderRadiusSM: 4,
  wireframe: false,
};

export default function AntdTheme({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: movieFlexToken,
        algorithm: theme.defaultAlgorithm,
        components: {
          Button: {
            primaryShadow: `0 8px 16px rgba(58,139,191,0.20)`,
            defaultBorderColor: '#c9d7e0',
            controlHeight: 36,
          },
          Input: {
            controlHeight: 36,
          },
          Card: {
            borderRadiusLG: 14,
          },
          Segmented: {
            borderRadius: 6,
          },
          Tabs: {
            horizontalItemActiveColor: '#3a8bbf',
            horizontalLineColor: '#d4e8f2',
          },
          Menu: {
            itemSelectedBg: 'rgba(58,139,191,0.10)',
            itemSelectedColor: '#3a8bbf',
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
