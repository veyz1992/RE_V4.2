
import { DesignState, TextLayer } from '../types';

export const generateNetlifyFunction = (design: DesignState): string => {
  const { backgroundImage, imageWidth, imageHeight, layers } = design;

  const drawCommands = layers
    .filter(l => l.enabled && l.type === 'text')
    .map(layer => {
      const textLayer = layer as TextLayer;
      
      let textVar = `text_${textLayer.id.replace(/-/g, '_')}`;
      let textValueAssignment = `let ${textVar} = '${textLayer.text.replace(/'/g, "\\'")}'`;

      if (textLayer.id === 'member-name') {
        textValueAssignment = `let ${textVar} = (params.member || '${textLayer.text}')`;
      } else if (textLayer.id === 'location') {
        textValueAssignment = `let ${textVar} = (params.location || '${textLayer.text}')`;
      } else if (textLayer.id === 'rating') {
        textValueAssignment = `let ${textVar} = (params.rating || '${textLayer.text}')`;
      } else if (textLayer.id === 'header') {
        textValueAssignment = `let ${textVar} = '${textLayer.text}'`;
      }

      if (textLayer.textTransform === 'uppercase') {
          textValueAssignment += `.toUpperCase()`;
      } else if (textLayer.textTransform === 'lowercase') {
          textValueAssignment += `.toLowerCase()`;
      } else if (textLayer.textTransform === 'capitalize') {
          textValueAssignment += `.replace(/\\b\\w/g, l => l.toUpperCase())`;
      }
      textValueAssignment += ';';

      let fillStyleCode = `ctx.fillStyle = '${textLayer.color}';`;
      if (textLayer.gradient?.enabled) {
          const g = textLayer.gradient;
          if (g.type === 'vertical') {
              fillStyleCode = `
    const grad_${textLayer.id} = ctx.createLinearGradient(${textLayer.x}, ${textLayer.y} - ${textLayer.fontSize}/2, ${textLayer.x}, ${textLayer.y} + ${textLayer.fontSize}/2);
    grad_${textLayer.id}.addColorStop(0, '${g.startColor}');
    grad_${textLayer.id}.addColorStop(1, '${g.endColor}');
    ctx.fillStyle = grad_${textLayer.id};
              `;
          } else {
              fillStyleCode = `
    const metrics_${textLayer.id} = ctx.measureText(${textVar});
    const width_${textLayer.id} = metrics_${textLayer.id}.width;
    let startX_${textLayer.id} = ${textLayer.x};
    if ('${textLayer.align}' === 'center') startX_${textLayer.id} -= (width_${textLayer.id} / 2);
    if ('${textLayer.align}' === 'right') startX_${textLayer.id} -= width_${textLayer.id};
    
    const grad_${textLayer.id} = ctx.createLinearGradient(startX_${textLayer.id}, ${textLayer.y}, startX_${textLayer.id} + width_${textLayer.id}, ${textLayer.y});
    grad_${textLayer.id}.addColorStop(0, '${g.startColor}');
    grad_${textLayer.id}.addColorStop(1, '${g.endColor}');
    ctx.fillStyle = grad_${textLayer.id};
              `;
          }
      }

      return `
    // Layer: ${textLayer.name}
    {
        ${textValueAssignment}
        ctx.font = '${textLayer.fontWeight} ${textLayer.fontSize}px "${textLayer.fontFamily}"';
        ctx.textAlign = '${textLayer.align}';
        ctx.textBaseline = 'middle';
        
        if (ctx.letterSpacing !== undefined) {
           ctx.letterSpacing = '${textLayer.letterSpacing || 0}px';
        }

        ${textLayer.shadow ? `
        ctx.shadowColor = '${textLayer.shadowColor}';
        ctx.shadowBlur = ${textLayer.shadowBlur};
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ` : `
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        `}

        ${fillStyleCode}
        
        ${textLayer.stroke?.enabled ? `
        ctx.lineWidth = ${textLayer.stroke.width};
        ctx.strokeStyle = '${textLayer.stroke.color}';
        const prevShadow = ctx.shadowColor;
        ctx.shadowColor = 'transparent';
        ctx.strokeText(${textVar}, ${textLayer.x}, ${textLayer.y});
        ctx.shadowColor = prevShadow;
        ` : ''}

        ctx.fillText(${textVar}, ${textLayer.x}, ${textLayer.y});
    }
      `;
    }).join('\n');

  return `const { createCanvas, loadImage, registerFont } = require('canvas');

exports.handler = async (event, context) => {
  try {
    const params = event.queryStringParameters || {};
    const width = ${imageWidth};
    const height = ${imageHeight};
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.quality = 'best';
    ctx.antialias = 'subpixel';

    const bgData = "${backgroundImage}"; 
    const background = await loadImage(bgData);
    ctx.drawImage(background, 0, 0, width, height);

    ${drawCommands}

    const buffer = canvas.toBuffer('image/png');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'image/png' },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
`;
};

export const generateEmbedCode = (design: DesignState): string => {
  const width = Math.min(design.imageWidth, 400);
  const baseUrl = "https://yoursite.netlify.app/.netlify/functions/badge";
  
  const exampleMember = encodeURIComponent(design.companyName || "RestorationFreaks.com");
  const exampleLoc = encodeURIComponent(design.location || "Jacksonville | FL");
  const ratingLayer = design.layers.find(l => l.id === 'rating') as TextLayer | undefined;
  const exampleRating = encodeURIComponent(ratingLayer?.text || 'A');

  return `<!-- Badge Embed Code -->
<a href="https://yoursite.com/verify/${exampleMember}" target="_blank" rel="noopener noreferrer">
  <img 
    src="${baseUrl}?member=${exampleMember}&location=${exampleLoc}&rating=${exampleRating}" 
    alt="Verified Badge"
    width="${width}"
    style="max-width: 100%; height: auto; display: block;"
  />
</a>`;
};
