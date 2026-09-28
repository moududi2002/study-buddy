// ============================================================
// Path: apps/api/src/subjects/subjects.controller.ts
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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { CreateSubjectDto, UpdateSubjectDto } from './dto';
import { SubjectsService } from './subjects.service';

@ApiTags('Subjects')
@ApiBearerAuth('access-token')
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  // ----------------------------------------------------------
  // GET /subjects
  // ----------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'আমার সব বিষয়' })
  list(@CurrentUser() user: AuthUser) {
    return this.subjectsService.list(user.id);
  }

  // ----------------------------------------------------------
  // POST /subjects
  // ----------------------------------------------------------
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'নতুন কাস্টম বিষয় যোগ করো' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(user.id, dto);
  }

  // ----------------------------------------------------------
  // PATCH /subjects/:id
  // ----------------------------------------------------------
  @Patch(':id')
  @ApiOperation({ summary: 'বিষয় আপডেট (কাস্টম পুরোটা, ডিফল্টে শুধু রং/আইকন)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.subjectsService.update(user.id, id, dto);
  }

  // ----------------------------------------------------------
  // DELETE /subjects/:id
  // ----------------------------------------------------------
  @Delete(':id')
  @ApiOperation({ summary: 'কাস্টম বিষয় মুছে ফেলো (ডিফল্ট মুছবে না)' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.subjectsService.remove(user.id, id);
  }
}