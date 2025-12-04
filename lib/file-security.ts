import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { validateFileAccess, getUserStoragePath } from './file-manager'

// استخراج معلومات المستخدم من JWT Token
export function extractUserFromRequest(request: NextRequest): { userId: number; email: string; role: string } | null {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return null
    }
    
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    const decoded = jwt.verify(token, secret) as any
    
    if (decoded.exp && decoded.exp > Math.floor(Date.now() / 1000)) {
      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      }
    }
    
    return null
  } catch (error) {
    console.error('Error extracting user from request:', error)
    return null
  }
}

// التحقق من صلاحيات الوصول للملف
export function checkFilePermission(
  userId: number, 
  filePath: string, 
  operation: 'read' | 'write' | 'delete'
): { allowed: boolean; reason?: string } {
  
  // التحقق الأساسي من أن الملف داخل مجلد المستخدم
  if (!validateFileAccess(userId, filePath)) {
    return {
      allowed: false,
      reason: 'File access denied: Outside user directory'
    }
  }
  
  // قواعد إضافية حسب نوع العملية
  switch (operation) {
    case 'read':
      // السماح بقراءة جميع الملفات في مجلد المستخدم
      return { allowed: true }
      
    case 'write':
      // منع الكتابة في ملفات النظام
      if (filePath.includes('system') || filePath.includes('config')) {
        return {
          allowed: false,
          reason: 'Write access denied: System file'
        }
      }
      return { allowed: true }
      
    case 'delete':
      // منع حذف ملفات مهمة
      if (filePath.includes('backup') || filePath.includes('system')) {
        return {
          allowed: false,
          reason: 'Delete access denied: Protected file'
        }
      }
      return { allowed: true }
      
    default:
      return {
        allowed: false,
        reason: 'Unknown operation'
      }
  }
}

// التحقق من حدود التخزين
export function checkStorageQuota(userId: number, fileSize: number): { allowed: boolean; reason?: string } {
  // حد أقصى 100 ميجابايت لكل مستخدم (يمكن تخصيصه)
  const MAX_STORAGE_MB = 100
  const MAX_STORAGE_BYTES = MAX_STORAGE_MB * 1024 * 1024
  
  // حد أقصى 10 ميجابايت لكل ملف
  const MAX_FILE_MB = 10
  const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024
  
  if (fileSize > MAX_FILE_BYTES) {
    return {
      allowed: false,
      reason: `File too large. Maximum file size is ${MAX_FILE_MB}MB`
    }
  }
  
  // هنا يمكن إضافة فحص الحجم الإجمالي للمستخدم
  // للبساطة، سنسمح بالرفع الآن
  return { allowed: true }
}

// التحقق من نوع الملف المسموح
export function checkFileType(fileName: string, allowedTypes?: string[]): { allowed: boolean; reason?: string } {
  const defaultAllowedTypes = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv',
    '.jpg', '.jpeg', '.png', '.gif', '.svg',
    '.txt', '.json', '.xml', '.zip', '.rar'
  ]
  
  const allowed = allowedTypes || defaultAllowedTypes
  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  
  if (!allowed.includes(fileExtension)) {
    return {
      allowed: false,
      reason: `File type not allowed. Allowed types: ${allowed.join(', ')}`
    }
  }
  
  return { allowed: true }
}

// تسجيل العمليات الأمنية
export function logSecurityEvent(
  userId: number, 
  operation: string, 
  filePath: string, 
  success: boolean, 
  reason?: string
) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    userId,
    operation,
    filePath: filePath.replace(getUserStoragePath(userId), '[USER_DIR]'), // إخفاء المسار الكامل
    success,
    reason
  }
  
  console.log('Security Event:', JSON.stringify(logEntry))
  
  // هنا يمكن إضافة تسجيل في قاعدة بيانات أو ملف log
}

// فحص شامل للأمان قبل العمليات
export function performSecurityCheck(
  userId: number,
  fileName: string,
  filePath: string,
  operation: 'read' | 'write' | 'delete',
  fileSize?: number
): { allowed: boolean; reason?: string } {
  
  // فحص صلاحيات الملف
  const filePermission = checkFilePermission(userId, filePath, operation)
  if (!filePermission.allowed) {
    logSecurityEvent(userId, operation, filePath, false, filePermission.reason)
    return filePermission
  }
  
  // فحص نوع الملف (للكتابة فقط)
  if (operation === 'write') {
    const fileType = checkFileType(fileName)
    if (!fileType.allowed) {
      logSecurityEvent(userId, operation, filePath, false, fileType.reason)
      return fileType
    }
    
    // فحص حدود التخزين
    if (fileSize) {
      const quota = checkStorageQuota(userId, fileSize)
      if (!quota.allowed) {
        logSecurityEvent(userId, operation, filePath, false, quota.reason)
        return quota
      }
    }
  }
  
  logSecurityEvent(userId, operation, filePath, true)
  return { allowed: true }
}

export default {
  extractUserFromRequest,
  checkFilePermission,
  checkStorageQuota,
  checkFileType,
  logSecurityEvent,
  performSecurityCheck
}
