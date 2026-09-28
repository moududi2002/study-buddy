// ============================================================
// Path: apps/api/src/study-entries/study-entries.controller.ts
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
import {
  CreateStudyEntryDto,
  QueryStudyEntryDto,
  UpdateStudyEntryDto,
} from './dto';
import { StudyEntriesService } from './study-entries.service';

@ApiTags('Study Entries')
@ApiBearerAuth('access-token')
@Controller('study-entries')
export class StudyEntriesController {
  constructor(private readonly studyEntriesService: StudyEntriesService) {}

  // ----------------------------------------------------------
  // POST /study-entries
  // ----------------------------------------------------------
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'নতুন পড়াশোনার এন্ট্রি যোগ করো' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStudyEntryDto) {
    return this.studyEntriesService.create(user.id, dto);
  }

  // ----------------------------------------------------------
  // GET /study-entries
  // ----------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'এন্ট্রি লিস্ট (ফিল্টার সহ)' })
  list(@CurrentUser() user: AuthUser, @Query() query: QueryStudyEntryDto) {
    return this.studyEntriesService.list(user.id, query);
  }

  // ----------------------------------------------------------
  // GET /study-entries/today
  // ----------------------------------------------------------
  @Get('today')
  @ApiOperation({ summary: 'আজকের সারসংক্ষেপ' })
  today(@CurrentUser() user: AuthUser) {
    return this.studyEntriesService.today(user.id);
  }

  // ----------------------------------------------------------
  // GET /study-entries/:id
  // ----------------------------------------------------------
  @Get(':id')
  @ApiOperation({ summary: 'একটি নির্দিষ্ট এন্ট্রি' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.studyEntriesService.findOne(user.id, id);
  }

  // ----------------------------------------------------------
  // PATCH /study-entries/:id
  // ----------------------------------------------------------
  @Patch(':id')
  @ApiOperation({ summary: 'এন্ট্রি আপডেট' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudyEntryDto,
  ) {
    return this.studyEntriesService.update(user.id, id, dto);
  }

  // ----------------------------------------------------------
  // DELETE /study-entries/:id
  // ----------------------------------------------------------
  @Delete(':id')
  @ApiOperation({ summary: 'এন্ট্রি মুছে ফেলো' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.studyEntriesService.remove(user.id, id);
  }
}