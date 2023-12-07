import { CreateMentoringSessionDto } from '@/[x]dto/create-mentoring-session.dto';
import { UpdateMentoringSessionDto } from '@/[x]dto/update-mentoring-session.dto';
// import { MentoringSession } from 'diagnostics_channel';
import { Repository } from 'typeorm';
import { database } from './database';
import { MentoringSession } from '@/[x]entities/mentoring-session.entity';
import { axiosInstance } from '@/util/instances';
import { checkConnection } from '@/util/global.constants';

export class MentoringSessionManager {
  constructor() {
    console.log('connect channel manager');
  }
  async findAllMentoringSessions() {
    // return this.channelRepository.find();
    try {
      const { data } = await axiosInstance.get('/mentoring-session', {
        headers: {
          'channel-token': 'Bearer ' + checkConnection.manager.serverToken,
        },
      });
      return data;
    } catch (error) {
      console.log('error on findAllMentoringSessions', error);
    }
  }
  findOneMentoringSessionById(id: number) {
    // return this.channelRepository.findOne({ where: { id } });
  }
  findOneMentoringSessionByname(name: string) {
    // return this.channelRepository.findOne({ where: { name } });
  }
  async findOneCategory(category: string) {
    try {
      const { data } = await axiosInstance.get(`/categories/value/${category}`);
      return data;
    } catch (error) {
      console.log('error findOneCategory', error);
    }
  }
  async createMentoringSession(sessionCategoryId: number) {
    // return this.channelRepository.insert(createMentoringSessionDto);
    try {
      const { data } = await axiosInstance.post(
        '/mentoring-session',
        {
          category_id: sessionCategoryId,
          topic: '',
          objective: '',
          format: '',
          note: '',
        },
        {
          headers: {
            'channel-token': 'Bearer ' + checkConnection.manager.serverToken,
          },
        },
      );
      return data;
    } catch (error) {
      console.log('error on findAllMentoringSessions', error);
    }
  }
  async createMatchingMentoring(session: number, user1: number, user2: number) {
    try {
      const { data } = await axiosInstance.post(
        '/mentoring',
        {
          session_id: session,
          mentor_id: user1,
          mentee_id: user2,
          status: 'joined',
        },
        {
          headers: {
            'channel-token': 'Bearer ' + checkConnection.manager.serverToken,
          },
        },
      );
      return data;
    } catch (error) {
      console.log('error on createMatchingMentring', error);
    }
  }
  updateMentoringSession(
    id: number,
    updateMentoringSessionDto: UpdateMentoringSessionDto,
  ) {
    // return this.channelRepository.update(id, updateMentoringSessionDto);
  }
  softDeleteMentoringSession(id: number) {
    // return this.channelRepository.softDelete({ id });
  }
  deleteMentoringSession(id: number) {
    // return this.channelRepository.delete({ id });
  }
  restoreMentoringSession(id: number) {
    // return this.channelRepository.restore({ id });
  }
}
