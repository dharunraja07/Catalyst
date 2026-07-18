import StudyGroup from '../models/StudyGroup.js'
import StudyMaterial from '../models/StudyMaterial.js'

const MAX_MATERIAL_CHARS = 6_000_000 // ~4.3MB decoded

async function assertMember(groupId, userId) {
  const group = await StudyGroup.findOne({ _id: groupId, members: userId })
  if (!group) {
    const error = new Error('Study group not found or access denied')
    error.status = 404
    throw error
  }
  return group
}

export async function listMaterials(req, res, next) {
  try {
    await assertMember(req.params.groupId, req.user._id)
    const materials = await StudyMaterial.find({ groupId: req.params.groupId })
      .select('-dataUrl') // list view stays light; full file is fetched on demand
      .populate('uploadedBy', 'name')
      .sort({ uploadedAt: -1 })
      .lean()
    res.json(materials)
  } catch (error) {
    next(error)
  }
}

export async function getMaterial(req, res, next) {
  try {
    const material = await StudyMaterial.findById(req.params.materialId).lean()
    if (!material) return res.status(404).json({ error: 'Material not found' })
    await assertMember(material.groupId, req.user._id)
    res.json(material)
  } catch (error) {
    next(error)
  }
}

export async function uploadMaterial(req, res, next) {
  try {
    await assertMember(req.params.groupId, req.user._id)
    const { fileName, fileType, dataUrl } = req.body
    if (!fileName || !dataUrl) {
      return res.status(400).json({ error: 'A file name and file content are required' })
    }
    if (dataUrl.length > MAX_MATERIAL_CHARS) {
      return res.status(413).json({ error: 'File is too large. Please upload something under 4MB.' })
    }

    const material = await StudyMaterial.create({
      groupId: req.params.groupId,
      uploadedBy: req.user._id,
      fileName,
      fileType: fileType || 'application/octet-stream',
      dataUrl
    })

    const populated = await material.populate('uploadedBy', 'name')
    const { dataUrl: _omit, ...withoutData } = populated.toObject()
    res.status(201).json(withoutData)
  } catch (error) {
    next(error)
  }
}

export async function deleteMaterial(req, res, next) {
  try {
    const material = await StudyMaterial.findById(req.params.materialId)
    if (!material) return res.status(404).json({ error: 'Material not found' })
    await assertMember(material.groupId, req.user._id)
    if (!material.uploadedBy.equals(req.user._id)) {
      return res.status(403).json({ error: 'Only the uploader can remove this material' })
    }
    await material.deleteOne()
    res.json({ message: 'Material removed' })
  } catch (error) {
    next(error)
  }
}
