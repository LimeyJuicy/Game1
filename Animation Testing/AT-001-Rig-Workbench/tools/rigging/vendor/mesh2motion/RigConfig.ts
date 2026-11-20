// Local adapter: this integration intentionally supports only the Quaternius human rig.
import { SkeletonType } from './enums/SkeletonType.ts';
export class RigConfig { static by_skeleton_type(type: SkeletonType) { if(type !== SkeletonType.Human) throw new Error('Only humanoid rigging is supported'); return { position_tracking_bone_name: 'pelvis' }; } }
