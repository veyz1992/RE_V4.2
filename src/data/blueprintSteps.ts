export interface BlueprintStep {
  id: string;
  category: 'foundation' | 'acceleration' | 'empire_legacy';
  title: string;
  description?: string;
  why?: string;
  checklist?: string[];
  section?: string;
}

export const BLUEPRINT_STEPS: BlueprintStep[] = [
  // Foundation Steps (1-33)
  { 
    id: 'foundation_01', 
    category: 'foundation', 
    title: 'Define Your Business Vision',
    description: 'Establish a clear, compelling vision for your restoration business',
    section: 'Business Setup',
    why: 'A clear vision guides every business decision and helps attract the right customers and team members.',
    checklist: ['Write your mission statement', 'Define your core values', 'Set 3-year vision goals']
  },
  { 
    id: 'foundation_02', 
    category: 'foundation', 
    title: 'Choose Your Business Structure',
    description: 'Select the appropriate legal entity for your business',
    section: 'Business Setup',
    why: 'The right business structure protects your personal assets and provides tax benefits.',
    checklist: ['Research LLC vs Corporation', 'Consult with accountant/lawyer', 'File formation documents']
  },
  { 
    id: 'foundation_03', 
    category: 'foundation', 
    title: 'Obtain Business License & Permits',
    description: 'Get all required licenses and permits to operate legally',
    section: 'Compliance',
    why: 'Operating without proper licenses can result in fines and legal issues.',
    checklist: ['Research local requirements', 'Apply for business license', 'Obtain specialty permits']
  },
  { 
    id: 'foundation_04', 
    category: 'foundation', 
    title: 'Set Up Business Banking',
    description: 'Establish dedicated business financial accounts',
    section: 'Finance',
    why: 'Separate business and personal finances for better accounting and tax purposes.',
    checklist: ['Open business checking account', 'Apply for business credit card', 'Set up accounting system']
  },
  { 
    id: 'foundation_05', 
    category: 'foundation', 
    title: 'Foundation Step 5 Placeholder',
    description: 'Placeholder for future content',
    section: 'Operations'
  },
  { id: 'foundation_06', category: 'foundation', title: 'Foundation Step 6 Placeholder' },
  { id: 'foundation_07', category: 'foundation', title: 'Foundation Step 7 Placeholder' },
  { id: 'foundation_08', category: 'foundation', title: 'Foundation Step 8 Placeholder' },
  { id: 'foundation_09', category: 'foundation', title: 'Foundation Step 9 Placeholder' },
  { id: 'foundation_10', category: 'foundation', title: 'Foundation Step 10 Placeholder' },
  { id: 'foundation_11', category: 'foundation', title: 'Foundation Step 11 Placeholder' },
  { id: 'foundation_12', category: 'foundation', title: 'Foundation Step 12 Placeholder' },
  { id: 'foundation_13', category: 'foundation', title: 'Foundation Step 13 Placeholder' },
  { id: 'foundation_14', category: 'foundation', title: 'Foundation Step 14 Placeholder' },
  { id: 'foundation_15', category: 'foundation', title: 'Foundation Step 15 Placeholder' },
  { id: 'foundation_16', category: 'foundation', title: 'Foundation Step 16 Placeholder' },
  { id: 'foundation_17', category: 'foundation', title: 'Foundation Step 17 Placeholder' },
  { id: 'foundation_18', category: 'foundation', title: 'Foundation Step 18 Placeholder' },
  { id: 'foundation_19', category: 'foundation', title: 'Foundation Step 19 Placeholder' },
  { id: 'foundation_20', category: 'foundation', title: 'Foundation Step 20 Placeholder' },
  { id: 'foundation_21', category: 'foundation', title: 'Foundation Step 21 Placeholder' },
  { id: 'foundation_22', category: 'foundation', title: 'Foundation Step 22 Placeholder' },
  { id: 'foundation_23', category: 'foundation', title: 'Foundation Step 23 Placeholder' },
  { id: 'foundation_24', category: 'foundation', title: 'Foundation Step 24 Placeholder' },
  { id: 'foundation_25', category: 'foundation', title: 'Foundation Step 25 Placeholder' },
  { id: 'foundation_26', category: 'foundation', title: 'Foundation Step 26 Placeholder' },
  { id: 'foundation_27', category: 'foundation', title: 'Foundation Step 27 Placeholder' },
  { id: 'foundation_28', category: 'foundation', title: 'Foundation Step 28 Placeholder' },
  { id: 'foundation_29', category: 'foundation', title: 'Foundation Step 29 Placeholder' },
  { id: 'foundation_30', category: 'foundation', title: 'Foundation Step 30 Placeholder' },
  { id: 'foundation_31', category: 'foundation', title: 'Foundation Step 31 Placeholder' },
  { id: 'foundation_32', category: 'foundation', title: 'Foundation Step 32 Placeholder' },
  { id: 'foundation_33', category: 'foundation', title: 'Foundation Step 33 Placeholder' },

  // Acceleration Steps (34-66)
  { id: 'acceleration_01', category: 'acceleration', title: 'Acceleration Step 1 Placeholder' },
  { id: 'acceleration_02', category: 'acceleration', title: 'Acceleration Step 2 Placeholder' },
  { id: 'acceleration_03', category: 'acceleration', title: 'Acceleration Step 3 Placeholder' },
  { id: 'acceleration_04', category: 'acceleration', title: 'Acceleration Step 4 Placeholder' },
  { id: 'acceleration_05', category: 'acceleration', title: 'Acceleration Step 5 Placeholder' },
  { id: 'acceleration_06', category: 'acceleration', title: 'Acceleration Step 6 Placeholder' },
  { id: 'acceleration_07', category: 'acceleration', title: 'Acceleration Step 7 Placeholder' },
  { id: 'acceleration_08', category: 'acceleration', title: 'Acceleration Step 8 Placeholder' },
  { id: 'acceleration_09', category: 'acceleration', title: 'Acceleration Step 9 Placeholder' },
  { id: 'acceleration_10', category: 'acceleration', title: 'Acceleration Step 10 Placeholder' },
  { id: 'acceleration_11', category: 'acceleration', title: 'Acceleration Step 11 Placeholder' },
  { id: 'acceleration_12', category: 'acceleration', title: 'Acceleration Step 12 Placeholder' },
  { id: 'acceleration_13', category: 'acceleration', title: 'Acceleration Step 13 Placeholder' },
  { id: 'acceleration_14', category: 'acceleration', title: 'Acceleration Step 14 Placeholder' },
  { id: 'acceleration_15', category: 'acceleration', title: 'Acceleration Step 15 Placeholder' },
  { id: 'acceleration_16', category: 'acceleration', title: 'Acceleration Step 16 Placeholder' },
  { id: 'acceleration_17', category: 'acceleration', title: 'Acceleration Step 17 Placeholder' },
  { id: 'acceleration_18', category: 'acceleration', title: 'Acceleration Step 18 Placeholder' },
  { id: 'acceleration_19', category: 'acceleration', title: 'Acceleration Step 19 Placeholder' },
  { id: 'acceleration_20', category: 'acceleration', title: 'Acceleration Step 20 Placeholder' },
  { id: 'acceleration_21', category: 'acceleration', title: 'Acceleration Step 21 Placeholder' },
  { id: 'acceleration_22', category: 'acceleration', title: 'Acceleration Step 22 Placeholder' },
  { id: 'acceleration_23', category: 'acceleration', title: 'Acceleration Step 23 Placeholder' },
  { id: 'acceleration_24', category: 'acceleration', title: 'Acceleration Step 24 Placeholder' },
  { id: 'acceleration_25', category: 'acceleration', title: 'Acceleration Step 25 Placeholder' },
  { id: 'acceleration_26', category: 'acceleration', title: 'Acceleration Step 26 Placeholder' },
  { id: 'acceleration_27', category: 'acceleration', title: 'Acceleration Step 27 Placeholder' },
  { id: 'acceleration_28', category: 'acceleration', title: 'Acceleration Step 28 Placeholder' },
  { id: 'acceleration_29', category: 'acceleration', title: 'Acceleration Step 29 Placeholder' },
  { id: 'acceleration_30', category: 'acceleration', title: 'Acceleration Step 30 Placeholder' },
  { id: 'acceleration_31', category: 'acceleration', title: 'Acceleration Step 31 Placeholder' },
  { id: 'acceleration_32', category: 'acceleration', title: 'Acceleration Step 32 Placeholder' },
  { id: 'acceleration_33', category: 'acceleration', title: 'Acceleration Step 33 Placeholder' },

  // Empire Legacy Steps (67-99)
  { id: 'empire_legacy_01', category: 'empire_legacy', title: 'Empire Legacy Step 1 Placeholder' },
  { id: 'empire_legacy_02', category: 'empire_legacy', title: 'Empire Legacy Step 2 Placeholder' },
  { id: 'empire_legacy_03', category: 'empire_legacy', title: 'Empire Legacy Step 3 Placeholder' },
  { id: 'empire_legacy_04', category: 'empire_legacy', title: 'Empire Legacy Step 4 Placeholder' },
  { id: 'empire_legacy_05', category: 'empire_legacy', title: 'Empire Legacy Step 5 Placeholder' },
  { id: 'empire_legacy_06', category: 'empire_legacy', title: 'Empire Legacy Step 6 Placeholder' },
  { id: 'empire_legacy_07', category: 'empire_legacy', title: 'Empire Legacy Step 7 Placeholder' },
  { id: 'empire_legacy_08', category: 'empire_legacy', title: 'Empire Legacy Step 8 Placeholder' },
  { id: 'empire_legacy_09', category: 'empire_legacy', title: 'Empire Legacy Step 9 Placeholder' },
  { id: 'empire_legacy_10', category: 'empire_legacy', title: 'Empire Legacy Step 10 Placeholder' },
  { id: 'empire_legacy_11', category: 'empire_legacy', title: 'Empire Legacy Step 11 Placeholder' },
  { id: 'empire_legacy_12', category: 'empire_legacy', title: 'Empire Legacy Step 12 Placeholder' },
  { id: 'empire_legacy_13', category: 'empire_legacy', title: 'Empire Legacy Step 13 Placeholder' },
  { id: 'empire_legacy_14', category: 'empire_legacy', title: 'Empire Legacy Step 14 Placeholder' },
  { id: 'empire_legacy_15', category: 'empire_legacy', title: 'Empire Legacy Step 15 Placeholder' },
  { id: 'empire_legacy_16', category: 'empire_legacy', title: 'Empire Legacy Step 16 Placeholder' },
  { id: 'empire_legacy_17', category: 'empire_legacy', title: 'Empire Legacy Step 17 Placeholder' },
  { id: 'empire_legacy_18', category: 'empire_legacy', title: 'Empire Legacy Step 18 Placeholder' },
  { id: 'empire_legacy_19', category: 'empire_legacy', title: 'Empire Legacy Step 19 Placeholder' },
  { id: 'empire_legacy_20', category: 'empire_legacy', title: 'Empire Legacy Step 20 Placeholder' },
  { id: 'empire_legacy_21', category: 'empire_legacy', title: 'Empire Legacy Step 21 Placeholder' },
  { id: 'empire_legacy_22', category: 'empire_legacy', title: 'Empire Legacy Step 22 Placeholder' },
  { id: 'empire_legacy_23', category: 'empire_legacy', title: 'Empire Legacy Step 23 Placeholder' },
  { id: 'empire_legacy_24', category: 'empire_legacy', title: 'Empire Legacy Step 24 Placeholder' },
  { id: 'empire_legacy_25', category: 'empire_legacy', title: 'Empire Legacy Step 25 Placeholder' },
  { id: 'empire_legacy_26', category: 'empire_legacy', title: 'Empire Legacy Step 26 Placeholder' },
  { id: 'empire_legacy_27', category: 'empire_legacy', title: 'Empire Legacy Step 27 Placeholder' },
  { id: 'empire_legacy_28', category: 'empire_legacy', title: 'Empire Legacy Step 28 Placeholder' },
  { id: 'empire_legacy_29', category: 'empire_legacy', title: 'Empire Legacy Step 29 Placeholder' },
  { id: 'empire_legacy_30', category: 'empire_legacy', title: 'Empire Legacy Step 30 Placeholder' },
  { id: 'empire_legacy_31', category: 'empire_legacy', title: 'Empire Legacy Step 31 Placeholder' },
  { id: 'empire_legacy_32', category: 'empire_legacy', title: 'Empire Legacy Step 32 Placeholder' },
  { id: 'empire_legacy_33', category: 'empire_legacy', title: 'Empire Legacy Step 33 Placeholder' },
];

export const getBlueprintStepsByCategory = () => {
  const foundation = BLUEPRINT_STEPS.filter(step => step.category === 'foundation');
  const acceleration = BLUEPRINT_STEPS.filter(step => step.category === 'acceleration');
  const empire_legacy = BLUEPRINT_STEPS.filter(step => step.category === 'empire_legacy');
  
  return { foundation, acceleration, empire_legacy };
};