'use strict';

const Requirement = require('../models/Requirement');
const { VALID_CATEGORIES } = require('../utils/pitchComplete');

// POST /api/requirements
async function createRequirement(req, res, next) {
  try {
    const { title, category, description, budgetMin, budgetMax, timeline } = req.body;

    // Cross-field budget validation
    if (
      budgetMin !== undefined &&
      budgetMax !== undefined &&
      Number(budgetMax) < Number(budgetMin)
    ) {
      return res.status(400).json({ message: 'budgetMax must be greater than or equal to budgetMin' });
    }

    const requirement = await Requirement.create({
      clientId: req.user.id,
      title,
      category,
      description,
      budgetMin,
      budgetMax,
      timeline,
      status: 'open', // always hardcoded; ignore any status in req.body
    });

    return res.status(201).json({ ...requirement.toObject(), bidCount: 0 });
  } catch (err) {
    next(err);
  }
}

// GET /api/requirements/mine
async function listOwnRequirements(req, res, next) {
  try {
    const docs = await Requirement.find({ clientId: req.user.id }).sort({ createdAt: -1 });

    const requirements = docs.map((doc) => ({ ...doc.toObject(), bidCount: 0 }));

    return res.status(200).json(requirements);
  } catch (err) {
    next(err);
  }
}

// GET /api/requirements/:id
async function getRequirement(req, res, next) {
  try {
    const doc = await Requirement.findById(req.params.id).populate('clientId', 'name company');

    if (!doc) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    const obj = doc.toObject();
    const result = {
      ...obj,
      clientName: obj.clientId?.name ?? null,
      clientCompany: obj.clientId?.company ?? null,
    };

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/requirements/:id
async function updateRequirement(req, res, next) {
  try {
    // 1. Find or 404
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    // 2. Ownership check or 403
    if (requirement.clientId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Forbidden: you do not own this requirement' });
    }

    // 3. Status must be open or 409
    if (requirement.status !== 'open') {
      return res.status(409).json({ message: 'Requirement cannot be edited unless it is open' });
    }

    // 4. Validate individual fields
    const allowed = ['title', 'category', 'description', 'budgetMin', 'budgetMax', 'timeline'];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.title !== undefined) {
      if (typeof updates.title !== 'string' || updates.title.length < 10 || updates.title.length > 200) {
        return res.status(400).json({ message: 'Title must be between 10 and 200 characters' });
      }
    }

    if (updates.category !== undefined) {
      if (!VALID_CATEGORIES.includes(updates.category)) {
        return res.status(400).json({ message: 'Category must be a valid ServiceCategory value' });
      }
    }

    if (updates.description !== undefined) {
      if (typeof updates.description !== 'string' || updates.description.length < 50) {
        return res.status(400).json({ message: 'Description must be at least 50 characters' });
      }
    }

    if (updates.timeline !== undefined) {
      if (
        typeof updates.timeline !== 'string' ||
        updates.timeline.length < 5 ||
        updates.timeline.length > 100
      ) {
        return res.status(400).json({ message: 'Timeline must be between 5 and 100 characters' });
      }
    }

    // 5. Cross-field budget validation
    const resolvedMin = updates.budgetMin !== undefined ? Number(updates.budgetMin) : requirement.budgetMin;
    const resolvedMax = updates.budgetMax !== undefined ? Number(updates.budgetMax) : requirement.budgetMax;
    if (resolvedMax < resolvedMin) {
      return res.status(400).json({ message: 'budgetMax must be greater than or equal to budgetMin' });
    }

    // 6. Apply updates and save
    Object.assign(requirement, updates);
    await requirement.save();

    return res.status(200).json(requirement.toObject());
  } catch (err) {
    next(err);
  }
}

// PATCH /api/requirements/:id/close
async function closeRequirement(req, res, next) {
  try {
    // 1. Find or 404
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    // 2. Ownership check or 403
    if (requirement.clientId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Forbidden: you do not own this requirement' });
    }

    // 3. Already closed or sealed → 409
    if (requirement.status === 'closed' || requirement.status === 'sealed') {
      return res.status(409).json({ message: 'Requirement is already closed or sealed' });
    }

    // 4. Set closed and save
    requirement.status = 'closed';
    await requirement.save();

    return res.status(200).json(requirement.toObject());
  } catch (err) {
    next(err);
  }
}

// GET /api/requirements/open
async function listOpenRequirements(req, res, next) {
  try {
    const docs = await Requirement.find({ status: 'open' })
      .populate('clientId', 'name company')
      .sort({ createdAt: -1 });

    const requirements = docs.map((doc) => {
      const obj = doc.toObject();
      return {
        ...obj,
        clientName: obj.clientId?.name ?? null,
        clientCompany: obj.clientId?.company ?? null,
      };
    });

    return res.status(200).json(requirements);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRequirement,
  listOwnRequirements,
  listOpenRequirements,
  getRequirement,
  updateRequirement,
  closeRequirement,
};
