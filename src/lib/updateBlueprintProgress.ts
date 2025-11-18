import { supabase } from './supabase';

export type BlueprintStatus = 'not_started' | 'in_progress' | 'completed';

export async function updateBlueprintProgress(opts: {
  profileId: string;
  stepId: string;
  checklistState?: boolean[];
  status?: BlueprintStatus;
  note?: string;
  checklistData?: any;
}) {
  const { profileId, stepId, checklistState, status, note, checklistData } = opts;

  // Build the update object with only provided fields
  const updateData: any = {
    profile_id: profileId,
    step_id: stepId,
    updated_at: new Date().toISOString(),
  };

  if (checklistState !== undefined) {
    updateData.checklist_state = checklistState;
  }
  if (status !== undefined) {
    updateData.status = status;
  }
  if (note !== undefined) {
    updateData.note = note;
  }
  if (checklistData !== undefined) {
    updateData.checklist_data = checklistData;
  }

  const { error } = await supabase
    .from('blueprint_progress')
    .upsert(updateData);

  if (error) {
    console.error('updateBlueprintProgress error', error);
    throw error;
  }
}