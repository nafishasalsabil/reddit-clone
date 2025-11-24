import { vote } from '../vote';
describe('vote callable', () => {
    it('rejects unauthenticated', async () => {
        await expect(vote.run({ targetType: 'post', targetId: 'x', value: 1 }, { auth: undefined })).rejects.toBeTruthy();
    });
});
