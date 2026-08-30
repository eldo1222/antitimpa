import { Comment } from '../types/comment.types';

export function mapCommentToDb(c: Partial<Comment>): Record<string, any> {
  const row: Record<string, any> = {};
  if (c.id !== undefined) row.id = c.id;
  if (c.comicId !== undefined) row.comic_id = c.comicId;
  if (c.chapterId !== undefined) row.chapter_id = c.chapterId;
  if (c.chapterNumber !== undefined) row.chapter_number = c.chapterNumber;
  if (c.userId !== undefined) row.user_id = c.userId;
  if (c.userName !== undefined || c.username !== undefined) row.username = c.userName || c.username;
  if (c.userAvatar !== undefined) row.user_avatar = c.userAvatar;
  if (c.userRole !== undefined) row.user_role = c.userRole;
  if (c.userEmail !== undefined) row.user_email = c.userEmail;
  if (c.content !== undefined) row.content = c.content;
  if (c.likesCount !== undefined || c.likes !== undefined) row.likes_count = c.likesCount ?? c.likes ?? 0;
  if (c.spoiler !== undefined || c.isSpoiler !== undefined) row.spoiler = c.spoiler ?? c.isSpoiler ?? false;
  if (c.replyToId !== undefined) row.reply_to_id = c.replyToId;
  if (c.isAdmin !== undefined) row.is_admin = c.isAdmin;
  if (c.isVip !== undefined) row.is_vip = c.isVip;
  row.created_at = c.createdAt || new Date().toISOString();
  return row;
}

export function mapDbToComment(c: Record<string, any>): Comment {
  return {
    id: c.id,
    comicId: c.comic_id || '',
    chapterId: c.chapter_id || undefined,
    chapterNumber: c.chapter_number ? Number(c.chapter_number) : undefined,
    userId: c.user_id || '',
    userName: c.username || 'Pembaca',
    username: c.username || 'Pembaca',
    userAvatar: c.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    userRole: c.user_role || undefined,
    userEmail: c.user_email || undefined,
    content: c.content || '',
    likesCount: Number(c.likes_count) || 0,
    likes: Number(c.likes_count) || 0,
    spoiler: Boolean(c.spoiler),
    isSpoiler: Boolean(c.spoiler),
    replyToId: c.reply_to_id || undefined,
    isAdmin: Boolean(c.is_admin),
    isVip: Boolean(c.is_vip),
    createdAt: c.created_at || new Date().toISOString(),
  };
}
