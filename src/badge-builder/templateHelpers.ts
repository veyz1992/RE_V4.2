
export const generateTemplateBackground = (templateId: string, width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  let primaryColor = '#fbbf24'; 
  let secondaryColor = '#b45309';
  let bgColor = '#fffbeb';

  if (templateId === 'expert') { 
    primaryColor = '#94a3b8';
    secondaryColor = '#475569';
    bgColor = '#f8fafc';
  } else if (templateId === 'aspiring') { 
    primaryColor = '#d97706';
    secondaryColor = '#78350f';
    bgColor = '#fff7ed';
  }

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = 20;
  ctx.strokeStyle = primaryColor;
  ctx.strokeRect(0, 0, width, height);
  
  ctx.lineWidth = 2;
  ctx.strokeStyle = secondaryColor;
  ctx.strokeRect(15, 15, width - 30, height - 30);

  ctx.beginPath();
  ctx.arc(935, 340, 80, 0, Math.PI * 2);
  ctx.fillStyle = primaryColor;
  ctx.fill();
  ctx.strokeStyle = secondaryColor;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(50, 300);
  ctx.lineTo(700, 300);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(50, 50, 100, 100);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 20px Helvetica';
  ctx.fillText('LOGO', 65, 110);

  return canvas.toDataURL();
};
