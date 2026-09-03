<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BackupRestoreLog extends Model
{
    protected $fillable = [
        'user_id', 'backup_file', 'safety_dump_path', 'status', 'ip',
        'started_at', 'finished_at', 'message',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
