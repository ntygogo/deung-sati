import crypto from 'crypto';
import { db } from '../db/database.js';
import type { IDatabaseAdapter } from '../db/types.js';

export interface MissionDefinition {
  id: string;
  category: 'notice' | 'separate' | 'pause' | 'choose' | 'reflect' | 'recover';
  title: string;
  description: string;
  reward_xp: number;
  reward_shells: number;
  requirement_type: string;
}

export interface UserMissionRecord {
  id: string;
  user_id: string;
  mission_id: string;
  status: 'active' | 'completed' | 'claimed' | 'dismissed';
  progress: number;
  target: number;
  assigned_at: string;
  completed_at: string | null;
  mission?: MissionDefinition;
}

export class MissionRepository {
  private adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter = db) {
    this.adapter = adapter;
  }

  async seedDefaultMissions(): Promise<void> {
    const defaults: MissionDefinition[] = [
      {
        id: 'mis_notice_emotion_1',
        category: 'notice',
        title: 'สังเกตอารมณ์และเรียกชื่อมัน',
        description: 'บอกความรู้สึกที่เกิดขึ้นตอนเริ่มมีเรื่องมากระทบใจ 1 ครั้ง',
        reward_xp: 15,
        reward_shells: 10,
        requirement_type: 'notice_emotion',
      },
      {
        id: 'mis_separate_fact_story_1',
        category: 'separate',
        title: 'แยกข้อเท็จจริงออกจากความคิด',
        description: 'ลองเขียนสิ่งที่เกิดขึ้นจริง เทียบกับสิ่งที่เราคิดหรือตีความไปเอง',
        reward_xp: 20,
        reward_shells: 15,
        requirement_type: 'separate_fact_story',
      },
      {
        id: 'mis_pause_before_react_1',
        category: 'pause',
        title: 'หยุด 5 วินาทีก่อนตอบสนอง',
        description: 'วางมือถือหรือหายใจลึกๆ 1 ครั้ง ก่อนตอบกลับข้อความที่ทำให้หงุดหงิด',
        reward_xp: 25,
        reward_shells: 20,
        requirement_type: 'pause_response',
      },
      {
        id: 'mis_choose_new_action_1',
        category: 'choose',
        title: 'ทดลองทางเลือกใหม่',
        description: 'เลือกทำสิ่งต่างจากลูปเดิม เช่น ชะลอการตอบ หรือเปลี่ยนอิริยาบถ',
        reward_xp: 30,
        reward_shells: 25,
        requirement_type: 'choose_new',
      },
      {
        id: 'mis_reflect_outcome_1',
        category: 'reflect',
        title: 'กลับมาบันทึกผลจริง',
        description: 'หลังจากผ่านเหตุการณ์ไปแล้ว กลับมาดูว่าผลลัพธ์เป็นอย่างไร',
        reward_xp: 30,
        reward_shells: 30,
        requirement_type: 'reflect_outcome',
      },
    ];

    for (const m of defaults) {
      await this.adapter.execute(
        `INSERT INTO missions (id, category, title, description, reward_xp, reward_shells, requirement_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [m.id, m.category, m.title, m.description, m.reward_xp, m.reward_shells, m.requirement_type]
      );
    }
  }

  async getUserMissions(userId: string): Promise<UserMissionRecord[]> {
    await this.seedDefaultMissions();

    let userMissions = await this.adapter.query<UserMissionRecord>(
      `SELECT um.*, m.category, m.title, m.description, m.reward_xp, m.reward_shells, m.requirement_type
       FROM user_missions um
       JOIN missions m ON um.mission_id = m.id
       WHERE um.user_id = $1 AND um.status != 'dismissed'
       ORDER BY um.assigned_at DESC`,
      [userId]
    );

    // If user has no active missions, assign default initial set
    if (userMissions.length === 0) {
      const allMissions = await this.adapter.query<MissionDefinition>('SELECT * FROM missions LIMIT 3');
      for (const m of allMissions) {
        const id = `um_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
        await this.adapter.execute(
          `INSERT INTO user_missions (id, user_id, mission_id, status, progress, target, assigned_at)
           VALUES ($1, $2, $3, 'active', 0, 1, CURRENT_TIMESTAMP)`,
          [id, userId, m.id]
        );
      }
      userMissions = await this.adapter.query<UserMissionRecord>(
        `SELECT um.*, m.category, m.title, m.description, m.reward_xp, m.reward_shells, m.requirement_type
         FROM user_missions um
         JOIN missions m ON um.mission_id = m.id
         WHERE um.user_id = $1 AND um.status != 'dismissed'
         ORDER BY um.assigned_at DESC`,
        [userId]
      );
    }

    return userMissions.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      mission_id: r.mission_id,
      status: r.status,
      progress: r.progress,
      target: r.target,
      assigned_at: r.assigned_at,
      completed_at: r.completed_at,
      mission: {
        id: r.mission_id,
        category: r.category,
        title: r.title,
        description: r.description,
        reward_xp: r.reward_xp,
        reward_shells: r.reward_shells,
        requirement_type: r.requirement_type,
      },
    }));
  }
}

export const missionRepository = new MissionRepository();
