import React from 'react';

interface PricingCardProps {
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Founding Member';
  price: string;
  pricePeriod: string;
  features: string[];
  popular?: boolean;
  onSelect: () => void;
  spotsRemaining?: number;
  buttonLabel?: string;
  disabled?: boolean;
  disabledText?: string;
}

const PricingCard: React.FC<PricingCardProps> = ({
  tier,
  price,
  pricePeriod,
  features,
  popular,
  onSelect,
  spotsRemaining,
  buttonLabel,
  disabled,
  disabledText,
}) => {
  const isFounding = tier === 'Founding Member';
  const cardClasses = `
    w-full p-6 border rounded-2xl flex flex-col transition-all duration-300
    ${isFounding 
      ? 'bg-gradient-to-br from-gold-dark to-founding-gold text-white border-founding-gold shadow-2xl scale-105' 
      : 'bg-white text-charcoal border-gray-border shadow-lg'}
    ${!isFounding && !disabled && 'transform hover:-translate-y-2'}
    ${popular && !isFounding ? 'border-gold border-2' : ''}
  `;

  const buttonText = buttonLabel || (isFounding ? 'Claim Spot' : 'Select');

  return (
    <div className={cardClasses}>
      {popular && !isFounding && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold text-charcoal px-4 py-1 rounded-full text-sm font-bold">
          ⭐ POPULAR
        </div>
      )}
      {isFounding && (
         <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-charcoal px-4 py-1 rounded-full text-sm font-bold">
          ⭐ LIMITED
        </div>
      )}

      <h3 className={`font-sora text-2xl font-bold text-center mb-2 ${isFounding ? 'text-white' : 'text-charcoal'}`}>{tier}</h3>
      <div className="text-center mb-6">
        <span className={`font-sora text-5xl font-bold ${isFounding ? 'text-white' : 'text-charcoal'}`}>{price}</span>
        <span className={`text-lg ml-1 ${isFounding ? 'text-gold-light' : 'text-gray'}`}>{pricePeriod}</span>
      </div>
      
      <ul className="space-y-3 mb-8 flex-grow">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start">
            <svg className={`w-5 h-5 mr-2 flex-shrink-0 mt-0.5 ${isFounding ? 'text-gold-light' : 'text-success'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            <span className={isFounding ? 'text-gray-200' : 'text-charcoal'}>{feature}</span>
          </li>
        ))}
      </ul>
      
      {isFounding && spotsRemaining !== undefined && (
        <div className="text-center mb-4 font-bold text-white bg-white/20 rounded-md py-1">
          ⏰ {spotsRemaining}/{25} remaining
        </div>
      )}

      <button 
        onClick={onSelect}
        disabled={disabled}
        className={`w-full py-3 px-6 font-bold text-lg rounded-lg transition-transform
          ${isFounding 
            ? 'bg-white text-charcoal hover:bg-gray-200' 
            : 'bg-gold text-charcoal hover:bg-gold-light'}
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'transform hover:scale-105'}
        `}
      >
        {buttonText} {!disabled && '▶'}
      </button>
      {disabled && disabledText && (
        <p className="text-center text-xs mt-3 text-gray">{disabledText}</p>
      )}
    </div>
  );
};

export default PricingCard;