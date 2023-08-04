import * as crypto from "crypto";
import { z } from "zod";
import {OnEventRequest, OnEventResponse} from "aws-cdk-lib/custom-resources/lib/provider-framework/types";

type ParsedRequest<T extends z.ZodSchema> = Omit<
  OnEventRequest,
  "PhysicalResourceId" | "ResourceProperties" | "OldResourceProperties"
> & {
  PhysicalResourceId: string;
  ResourceProperties: z.output<T>;
  OldResourceProperties?: z.output<T>;
};

type ParsedResult<T extends z.ZodSchema> = Omit<
  OnEventResponse,
  "Data"
> & {
  Data: z.output<T>;
};

type IdOptions = {
  maxLength: number;
  randomLength?: number;
};

export abstract class ResourceManager<
  PropertiesSchema extends z.ZodSchema,
  DataSchema extends z.ZodSchema
> {
  protected generateId(
    logicalId: string,
    options: {
      maxLength: number;
      randomLength?: number;
    }
  ): string {
    const random = crypto
      .randomBytes(options.randomLength ?? 4)
      .toString("hex");
    const suffix = `-${random}`;
    return [logicalId.slice(0, options.maxLength - suffix.length), suffix].join(
      ""
    );
  }

  constructor(
    protected readonly propertiesSchema: PropertiesSchema,
    protected readonly dataSchema: DataSchema,
    private options: {
      id: IdOptions;
      create: (
        event: ParsedRequest<PropertiesSchema>
      ) => Promise<ParsedResult<DataSchema>>;
      update: (
        event: ParsedRequest<PropertiesSchema>
      ) => Promise<ParsedResult<DataSchema>>;
      delete: (event: ParsedRequest<PropertiesSchema>) => Promise<void>;
    }
  ) {}

  protected parseProperties(properties: unknown): z.output<PropertiesSchema> {
    return this.propertiesSchema.parse(properties);
  }

  public async create(
    event: OnEventRequest
  ): Promise<OnEventResponse> {
    const id =
      event.PhysicalResourceId ??
      this.generateId(event.LogicalResourceId, this.options.id);
    const properties = this.parseProperties(event.ResourceProperties);
    const result = await this.options.create({
      ...event,
      PhysicalResourceId: id,
      ResourceProperties: properties,
    });
    return {
      PhysicalResourceId: result.PhysicalResourceId,
      Data: this.dataSchema.parse(result.Data),
    };
  }

  public async update(
    event: OnEventRequest
  ): Promise<OnEventResponse> {
    const properties = this.parseProperties(event.ResourceProperties);
    const oldProperties = this.parseProperties(event.OldResourceProperties);
    const result = await this.options.update({
      ...event,
      PhysicalResourceId: event.PhysicalResourceId!,
      ResourceProperties: properties,
      OldResourceProperties: oldProperties,
    });
    return {
      Data: this.dataSchema.parse(result.Data),
    };
  }

  public async delete(
    event: OnEventRequest
  ): Promise<OnEventResponse> {
    const properties = this.parseProperties(event.ResourceProperties);
    await this.options.delete({
      ...event,
      PhysicalResourceId: event.PhysicalResourceId!,
      ResourceProperties: properties,
    });
    return {};
  }
}
