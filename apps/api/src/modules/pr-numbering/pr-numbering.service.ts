import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrSequence } from './schemas/pr-sequence.schema';
import { PrNumberConfig } from './schemas/pr-number-config.schema';
import { UpdatePrNumberConfigDto } from './dto/update-pr-number-config.dto';
import { SetCurrentSeriesDto } from './dto/set-current-series.dto';

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
    const sequences = await this.sequenceModel.find().sort({ year: -1 });
    const currentSequence = sequences.find((s) => s.year === year) ?? null;
    const totalPrsThisYear = currentSequence?.lastNumber ?? 0;

    return {
      config,
      sequences,
      year,
      currentSequence,
      totalPrsThisYear,
      formatPattern: this.buildFormatPattern(config),
    };
  }

  async getPreview() {
    const config = await this.getConfig();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const sequence = await this.sequenceModel.findOne({ year });
    const nextNumber = (sequence?.lastNumber ?? 0) + 1;

    const preview = this.formatPrNumber(config, year, month, nextNumber);
    const pattern = this.buildFormatPattern(config);

    return { preview, pattern, nextNumber };
  }

  async setCurrentSeries(dto: SetCurrentSeriesDto): Promise<PrSequence> {
    if (dto.lastNumber < 0) {
      throw new BadRequestException('lastNumber cannot be negative');
    }
    const sequence = await this.sequenceModel.findOneAndUpdate(
      { year: dto.year },
      { $set: { lastNumber: dto.lastNumber } },
      { new: true, upsert: true },
    );
    return sequence;
  }

  async generatePrNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const config = await this.getConfig();

    const sequence = await this.sequenceModel.findOneAndUpdate(
      { year },
      { $inc: { lastNumber: 1 } },
      { new: true, upsert: true },
    );

    return this.formatPrNumber(config, year, month, sequence.lastNumber);
  }

  private formatPrNumber(
    config: PrNumberConfig,
    year: number,
    month: number,
    sequenceNumber: number,
  ): string {
    const sep = config.separator || '-';
    const yearStr = String(year);
    const monthStr = String(month).padStart(2, '0');
    const seqStr = String(sequenceNumber).padStart(config.sequenceDigits, '0');

    return [yearStr, monthStr, seqStr].join(sep);
  }

  private buildFormatPattern(config: PrNumberConfig): string {
    const sep = config.separator || '-';
    const seqPlaceholder = '{' + '#'.repeat(config.sequenceDigits) + '}';
    return ['YYYY', 'MM', seqPlaceholder].join(sep);
  }
}
