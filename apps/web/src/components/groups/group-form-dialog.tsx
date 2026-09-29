// ============================================================
// Path: apps/web/src/components/groups/group-form-dialog.tsx
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { GroupAvatar } from './group-avatar';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (groupId: string) => void;
  editing?: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    weeklyTargetMinutes: number | null;
  } | null;
}

export function GroupFormDialog({ open, onOpenChange, onSaved, editing }: Props) {
  const isEdit = !!editing;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetHours, setTargetHours] = useState<number | ''>(10);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setDescription(editing.description ?? '');
        setTargetHours(
          editing.weeklyTargetMinutes ? Math.round(editing.weeklyTargetMinutes / 60) : '',
        );
        setImageUrl(editing.imageUrl);
      } else {
        setName('');
        setDescription('');
        setTargetHours(10);
        setImageUrl(null);
      }
    }
  }, [open, editing]);

  const uploadImage = async (file: File) => {
    if (file.size > 3 * 1024 * 1024) {
      toast.error('ছবি ৩ মেগাবাইটের কম হতে হবে');
      return;
    }
    setUploading(true);
    try {
      // For create flow, we need a group id first. If editing, upload directly.
      if (!editing?.id) {
        toast.error('প্রথমে গ্রুপ তৈরি করো, তারপর ছবি দাও');
        return;
      }
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload<{ imageUrl: string }>(
        `/groups/${editing.id}/image`,
        fd,
      );
      setImageUrl(res.data.imageUrl);
      toast.success('গ্রুপের ছবি আপডেট হয়েছে');
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'আপলোড ব্যর্থ');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error('গ্রুপের নাম দাও');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        weeklyTargetMinutes: targetHours ? Number(targetHours) * 60 : undefined,
      };

      if (isEdit) {
        const res = await api.patch<{ success: true; message: string }>(
          `/groups/${editing!.id}`,
          payload,
        );
        toast.success(res.message);
        onSaved(editing!.id);
      } else {
        const res = await api.post<{ success: true; message: string; data: { id: string } }>(
          '/groups',
          payload,
        );
        toast.success(res.message);
        onSaved(res.data.id);
      }
      onOpenChange(false);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'সংরক্ষণ করা যায়নি');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{isEdit ? 'গ্রুপ এডিট করো' : 'নতুন গ্রুপ বানাও 🎉'}</DialogTitle>
        <DialogDescription>
          বন্ধুদের নিয়ে দল বানাও, একসাথে পড়ো এবং এগিয়ে যাও!
        </DialogDescription>

        <div className="space-y-4 mt-2">
          {/* Image (only on edit since new group has no ID yet) */}
          {isEdit && (
            <div className="flex justify-center">
              <div className="relative">
                <GroupAvatar name={name || 'গ্রুপ'} imageUrl={imageUrl} size={80} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-soft hover:scale-110 transition-transform disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Camera size={14} />
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <Label>গ্রুপের নাম</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: গণিত দল"
              maxLength={60}
            />
          </div>

          <div>
            <Label>বর্ণনা (ঐচ্ছিক)</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="এই গ্রুপের উদ্দেশ্য কী?"
              maxLength={300}
              rows={2}
              className="w-full rounded-2xl border border-primary-200 bg-white px-4 py-3 outline-none focus:border-primary-400 focus:ring-2 focus:ring-lavender-200 text-primary-900 placeholder:text-primary-300 resize-none"
            />
          </div>

          <div>
            <Label>সাপ্তাহিক লক্ষ্য (ঘণ্টা)</Label>
            <Input
              type="number"
              min={0}
              max={1000}
              value={targetHours}
              onChange={(e) =>
                setTargetHours(e.target.value ? Number(e.target.value) : '')
              }
              placeholder="যেমন: ১০"
            />
            <p className="text-xs text-primary-400 mt-1 pl-1">
              সব সদস্য মিলিয়ে সপ্তাহে কত ঘণ্টা পড়ার লক্ষ্য
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="secondary" className="flex-1">
                বাতিল
              </Button>
            </DialogClose>
            <Button onClick={save} loading={saving} className="flex-1">
              {isEdit ? 'আপডেট' : 'বানাও'}
            </Button>
          </div>

          {!isEdit && (
            <p className="text-xs text-center text-primary-400">
              💡 গ্রুপ তৈরির পর ছবি দিতে পারবে
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}