// API للتحكم في مهام الاستيراد الفردية
import { NextRequest, NextResponse } from 'next/server'
import { BackgroundJobManager } from '@/lib/background-jobs'
import { CheckpointManager } from '@/lib/background-jobs'
import { IdempotencyManager } from '@/lib/idempotency'

// GET - الحصول على تفاصيل مهمة محددة
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const job = BackgroundJobManager.getJob(jobId)
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // إضافة معلومات إضافية
    const checkpoint = CheckpointManager.getCheckpoint(jobId)
    const idempotencyStats = IdempotencyManager.getStats()

    return NextResponse.json({
      job,
      checkpoint,
      idempotencyStats,
      canResume: job.status === 'paused' && !!checkpoint,
      canCancel: ['running', 'paused', 'pending'].includes(job.status),
      canRetry: job.status === 'failed'
    })

  } catch (error) {
    console.error('❌ Get job error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PATCH - تحديث حالة المهمة
export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params
    const { action, ...updates } = await request.json()

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const job = BackgroundJobManager.getJob(jobId)
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    let success = false
    let message = ''
    let newStatus = job.status

    switch (action) {
      case 'pause':
        if (['running', 'pending'].includes(job.status)) {
          success = BackgroundJobManager.pauseJob(jobId)
          newStatus = 'paused'
          message = success ? 'Job paused successfully' : 'Failed to pause job'
        } else {
          message = `Cannot pause job with status: ${job.status}`
        }
        break

      case 'resume':
        if (job.status === 'paused') {
          const checkpoint = CheckpointManager.getCheckpoint(jobId)
          if (checkpoint) {
            BackgroundJobManager.updateJob(jobId, { 
              status: 'running',
              data: {
                ...job.data,
                cursor: checkpoint.cursor
              }
            })
            newStatus = 'running'
            success = true
            message = 'Job resumed successfully'
          } else {
            message = 'Cannot resume job: no checkpoint found'
          }
        } else {
          message = `Cannot resume job with status: ${job.status}`
        }
        break

      case 'cancel':
        if (['running', 'paused', 'pending'].includes(job.status)) {
          success = BackgroundJobManager.cancelJob(jobId)
          newStatus = 'cancelled'
          message = success ? 'Job cancelled successfully' : 'Failed to cancel job'
          
          // تنظيف checkpoint
          CheckpointManager.clearCheckpoint(jobId)
        } else {
          message = `Cannot cancel job with status: ${job.status}`
        }
        break

      case 'retry':
        if (job.status === 'failed') {
          // إعادة تعيين حالة المهمة للمحاولة مرة أخرى
          BackgroundJobManager.updateJob(jobId, {
            status: 'pending',
            results: {
              imported: 0,
              failed: 0,
              duplicates: 0,
              errors: []
            },
            progress: {
              current: 0,
              total: 0,
              percentage: 0
            }
          })
          newStatus = 'pending'
          success = true
          message = 'Job queued for retry'
        } else {
          message = `Cannot retry job with status: ${job.status}`
        }
        break

      case 'update':
        // تحديث عام للمهمة
        if (updates) {
          BackgroundJobManager.updateJob(jobId, updates)
          success = true
          message = 'Job updated successfully'
        } else {
          message = 'No updates provided'
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: pause, resume, cancel, retry, or update' },
          { status: 400 }
        )
    }

    // إرجاع المهمة المحدثة
    const updatedJob = BackgroundJobManager.getJob(jobId)

    return NextResponse.json({
      success,
      message,
      job: updatedJob,
      previousStatus: job.status,
      newStatus
    })

  } catch (error) {
    console.error('❌ Update job error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - حذف مهمة
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const job = BackgroundJobManager.getJob(jobId)
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // لا يمكن حذف المهام النشطة
    if (['running', 'pending'].includes(job.status)) {
      return NextResponse.json(
        { error: 'Cannot delete active job. Cancel it first.' },
        { status: 400 }
      )
    }

    // إلغاء المهمة أولاً إذا كانت متوقفة
    if (job.status === 'paused') {
      BackgroundJobManager.cancelJob(jobId)
    }

    // حذف المهمة والـ checkpoint
    if (global.backgroundJobs) {
      global.backgroundJobs.delete(jobId)
    }
    
    if (global.activeJobControllers) {
      global.activeJobControllers.delete(jobId)
    }
    
    CheckpointManager.clearCheckpoint(jobId)

    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully'
    })

  } catch (error) {
    console.error('❌ Delete job error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
