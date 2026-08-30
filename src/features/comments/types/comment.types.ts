export interface Comment {
  id: string;
  comicId: string;
  chapterId?: string;
  chapterNumber?: number;
  userId: string;
  userName?: string;
  username?: string;
  userAvatar: string;
  userRole?: 'admin' | 'reader' | 'google_user' | 'guest';
  authProvider?: 'google' | 'admin_account' | 'guest';
  userEmail?: string;
  content: string;
  createdAt: string;
  likesCount?: number;
  likes?: number;
  likedBy?: string[];
  spoiler?: boolean;
  isSpoiler?: boolean;
  replyToId?: string;
  isAdmin?: boolean;
  isVip?: boolean;
  isLiked?: boolean;
  isGoogleUser?: boolean;
}

export type CommentItem = Comment;
