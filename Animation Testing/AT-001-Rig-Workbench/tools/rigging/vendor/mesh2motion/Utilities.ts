import { Bone, Vector3, type Object3D } from 'three';
export class Utility {
  static world_position_from_object (object: Object3D): Vector3 {
    const position: Vector3 = new Vector3()
    return object.getWorldPosition(position)
  }
  static direction_between_points (point_1: Vector3, point_2: Vector3): Vector3 {
    const direction: Vector3 = new Vector3()
    direction.subVectors(point_2, point_1).normalize()
    return direction
  }
  static is_leaf_bone (bone: Bone): boolean {
    if (bone.children.length > 0) return false
    const name = bone.name.toLowerCase()
    return name.includes('leaf') || name.includes('tip')
  }
  static primary_child_bone (bone: Bone): Bone | undefined {
    const child_bones = bone.children.filter((c): c is Bone => c instanceof Bone)
    return child_bones.find(c => Utility.is_leaf_bone(c)) ?? child_bones[0]
  }
  static bone_midpoint_to_child (bone: Bone): Vector3 {
    const bone_position = Utility.world_position_from_object(bone)
    const child = Utility.primary_child_bone(bone)
    if (child === undefined) {
      return bone_position.clone()
    }
    const child_position = Utility.world_position_from_object(child)
    return new Vector3().lerpVectors(bone_position, child_position, 0.5)
  }
  static bone_list_from_hierarchy (bone_hierarchy: Object3D): Bone[] {
    if (bone_hierarchy === undefined || bone_hierarchy === null) {
      console.warn('bone_hierarchy is undefined or null')
      return []
    }

    const bones: Bone[] = []
    bone_hierarchy.traverse((bone: Object3D) => {
      if (bone instanceof Bone) {
        bones.push(bone)
      }
    })

    return bones
  }
}
