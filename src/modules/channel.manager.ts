import { CreateChannelDto } from '@/dto/create-channel.dto';
import { UpdateChannelDto } from '@/dto/update-channel.dto';
// import { Channel } from 'diagnostics_channel';
import { Repository } from 'typeorm';
import { database } from './database';
import { Channel } from '@/entities/channel.entity';

export class ChannelManager {
  constructor(
    private readonly channelRepository: Repository<Channel> = database.getRepository(
      Channel,
    ),
  ) {
    console.log('connect channel manager');
  }
  findAllChannels() {
    return this.channelRepository.find();
  }
  findOneChannelById(id: number) {
    return this.channelRepository.findOne({ where: { id } });
  }
  findOneChannelByname(name: string) {
    return this.channelRepository.findOne({ where: { name } });
  }
  createChannel(createChannelDto: CreateChannelDto) {
    return this.channelRepository.insert(createChannelDto);
  }
  updateChannel(id: number, updateChannelDto: UpdateChannelDto) {
    return this.channelRepository.update(id, updateChannelDto);
  }
  softDeleteChannel(id: number) {
    return this.channelRepository.softDelete({ id });
  }
  deleteChannel(id: number) {
    return this.channelRepository.delete({ id });
  }
  restoreChannel(id: number) {
    return this.channelRepository.restore({ id });
  }
}
