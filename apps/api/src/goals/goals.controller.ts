// ============================================================
// Path: apps/api/src/goals/goals.controller.ts
// ============================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { CreateGoalDto, QueryGoalDto, UpdateGoalDto } from './dto';
import { GoalsService } from './goals.service';

@ApiTags('Goals')
@ApiBearerAuth('access-token')
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'নতুন লক্ষ্য নির্ধারণ' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'লক্ষ্য লিস্ট (progress সহ)' })
  list(@CurrentUser() user: AuthUser, @Query() query: QueryGoalDto) {
    return this.goalsService.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'একটি লক্ষ্য' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.goalsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'লক্ষ্য আপডেট (complete mark সহ)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'লক্ষ্য মুছে ফেলো' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.goalsService.remove(user.id, id);
  }
}