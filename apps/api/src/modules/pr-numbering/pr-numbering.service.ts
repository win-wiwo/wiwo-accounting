import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrSequence } from './schemas/pr-sequence.schema';
import { PrNumberConfig } from './schemas/pr-number-config.schema';
import { UpdatePrNumberConfigDto } from './dto/update-pr-number-config.dto';

@Injectable()
export class PrNumberingService {
  constructor(
    @InjectModel(PrSequence.name) private sequenceModel: Model<PrSequence>,
    @InjectModel(PrNumberConfig.name) private configModel: Model<PrNumberConfig>,
  ) {}

  async getConfig(): Promise<PrNumberConfig> {
    let config = await this.configModel.findOne();
    if (!config) {
      config = await this.configModel.create({});
    }
    return config;
  }

  async updateConfig(dto: UpdatePrNumberConfigDto): Promise<PrNumberConfig> {
    const config = await this.configModel.findOneAndUpdate(
      {},
      { $set: dto },
      { new: true, upsert: true },
    );
    return config;
  }

  async getSeriesInfo() {
    const year = new Date().getFullYear();
    const config = await this.getConfig();
    const sequences = await this.sequenceModel.find({ year }).sort({ departmentCode: 1 });

    const totalPrsThisYear = sequences.reduce((sum, seq) => sum + seq.lastNumber, 0);

    return {
      config,
      sequences,
      year,
      totalPrsThisYear,
      formatPattern: this.buildFormatPattern(config),
    };
  }

  async getPreview() {
    const config = await this.getConfig();
    const year = new Date().getFullYear();
    const exampleDeptCode = 'ENG';

    // Find the current sequence for the example department, or use 0
    const sequence = await this.sequenceModel.findOne({ departmentCode: exampleDeptCode, year });
    const nextNumber = (sequence?.lastNumber ?? 0) + 1;

    const preview = this.formatPrNumber(config, exampleDeptCode, year, nextNumber);
    const pattern = this.buildFormatPattern(config);

    return { preview, pattern, nextNumber };
  }

  async generatePrNumber(departmentCode: string, prefixOverride?: string): Promise<string> {
    const year = new Date().getFullYear();
    const config = await this.getConfig();

    const sequence = await this.sequenceModel.findOneAndUpdate(
      { departmentCode, year },
      { $inc: { lastNumber: 1 } },
      { new: true, upsert: true },
    );

    return this.formatPrNumber(config, departmentCode, year, sequence.lastNumber, prefixOverride);
  }

  private formatPrNumber(
    config: PrNumberConfig,
    departmentCode: string,
    year: number,
    sequenceNumber: number,
    prefixOverride?: string,
  ): string {
    const parts: string[] = [prefixOverride ?? config.prefix];

    if (config.includeDepartmentCode) {
      parts.push(departmentCode);
    }

    if (config.includeYear) {
      const yearStr = config.yearFormat === 'short'
        ? String(year).slice(-2)
        : String(year);
      parts.push(yearStr);
    }

    const paddedNumber = String(sequenceNumber).padStart(config.sequenceDigits, '0');
    parts.push(paddedNumber);

    return parts.join(config.separator);
  }

  private buildFormatPattern(config: PrNumberConfig): string {
    const parts: string[] = [config.prefix];

    if (config.includeDepartmentCode) {
      parts.push('{DEPT}');
    }

    if (config.includeYear) {
      parts.push(config.yearFormat === 'short' ? '{YY}' : '{YYYY}');
    }

    parts.push('{' + '#'.repeat(config.sequenceDigits) + '}');

    return parts.join(config.separator);
  }
}
