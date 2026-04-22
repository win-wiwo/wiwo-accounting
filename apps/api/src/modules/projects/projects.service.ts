import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Project } from './schemas/project.schema';
import { CreateProjectDto, UpdateProjectDto, QueryProjectsDto } from './dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
  ) {}

  async findAll(query: QueryProjectsDto) {
    const { page = 1, limit = 50, search, status } = query;
    const filter: FilterQuery<Project> = {};

    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .populate('createdBy', 'firstName lastName')
        .sort({ status: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.projectModel.countDocuments(filter),
    ]);

    return {
      data: projects,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findActive() {
    return this.projectModel
      .find({ status: 'active' })
      .select('_id name code description')
      .sort({ name: 1 })
      .exec();
  }

  async findById(id: string): Promise<Project> {
    const project = await this.projectModel
      .findById(id)
      .populate('createdBy', 'firstName lastName')
      .exec();
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(dto: CreateProjectDto, createdById: string): Promise<Project> {
    if (dto.code) {
      const existing = await this.projectModel.findOne({ code: dto.code.toUpperCase() });
      if (existing) throw new ConflictException(`Project code "${dto.code.toUpperCase()}" is already in use`);
    }

    const project = new this.projectModel({
      name: dto.name,
      code: dto.code ? dto.code.toUpperCase() : null,
      description: dto.description || null,
      status: 'active',
      createdBy: createdById,
    });

    return project.save();
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    if (dto.code) {
      const existing = await this.projectModel.findOne({
        code: dto.code.toUpperCase(),
        _id: { $ne: id },
      });
      if (existing) throw new ConflictException(`Project code "${dto.code.toUpperCase()}" is already in use`);
    }

    const project = await this.projectModel.findById(id);
    if (!project) throw new NotFoundException('Project not found');

    if (dto.name !== undefined) project.name = dto.name;
    if (dto.code !== undefined) project.code = dto.code ? dto.code.toUpperCase() : null;
    if (dto.description !== undefined) project.description = dto.description || null;
    if (dto.status !== undefined) project.status = dto.status as any;

    await project.save();

    return this.projectModel.findById(id).populate('createdBy', 'firstName lastName').exec() as Promise<Project>;
  }
}
