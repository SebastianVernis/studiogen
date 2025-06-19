import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/user';
import { ImageGenerationModel } from '@/lib/models/image-generation';

export async function GET() {
  try {
    console.log('Testing database models...');
    
    const results = {
      success: true,
      message: 'Database models tested successfully',
      tests: []
    };

    // Test User Model
    try {
      // This will fail with real DB but we can catch and show the structure
      const users = await UserModel.list(5, 0);
      results.tests.push({
        model: 'UserModel',
        method: 'list',
        status: 'success',
        result: users
      });
    } catch (error) {
      results.tests.push({
        model: 'UserModel',
        method: 'list',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        note: 'Expected to fail without database connection'
      });
    }

    // Test Image Generation Model
    try {
      const generations = await ImageGenerationModel.getByStatus('pending', 5);
      results.tests.push({
        model: 'ImageGenerationModel',
        method: 'getByStatus',
        status: 'success',
        result: generations
      });
    } catch (error) {
      results.tests.push({
        model: 'ImageGenerationModel',
        method: 'getByStatus',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        note: 'Expected to fail without database connection'
      });
    }

    // Show model interfaces for reference
    results.modelInterfaces = {
      User: {
        id: 'number (optional)',
        email: 'string (required)',
        name: 'string (optional)',
        avatar_url: 'string (optional)',
        created_at: 'Date (optional)',
        updated_at: 'Date (optional)'
      },
      ImageGeneration: {
        id: 'number (optional)',
        user_id: 'number (required)',
        project_id: 'number (optional)',
        prompt: 'string (required)',
        refined_prompt: 'string (optional)',
        artistic_style: 'string (optional)',
        image_url: 'string (optional)',
        thumbnail_url: 'string (optional)',
        status: "'pending' | 'processing' | 'completed' | 'failed'",
        generation_params: 'any (optional)',
        error_message: 'string (optional)',
        created_at: 'Date (optional)',
        updated_at: 'Date (optional)'
      }
    };

    results.availableMethods = {
      UserModel: [
        'create(userData)',
        'findById(id)',
        'findByEmail(email)',
        'update(id, userData)',
        'delete(id)',
        'list(limit, offset)'
      ],
      ImageGenerationModel: [
        'create(data)',
        'findById(id)',
        'findByUserId(userId, limit, offset)',
        'findByProjectId(projectId, limit, offset)',
        'updateStatus(id, status, errorMessage)',
        'updateImageUrls(id, imageUrl, thumbnailUrl)',
        'delete(id)',
        'getByStatus(status, limit)'
      ]
    };

    return NextResponse.json(results);
    
  } catch (error) {
    console.error('Model test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Model testing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
