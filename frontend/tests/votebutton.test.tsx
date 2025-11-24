import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import VoteButton from '@/components/VoteButton'
import * as postStore from '@/store/postStore'

vi.spyOn(postStore, 'usePostStore').mockImplementation((selector: any) => selector({
  postById: { p1: { id: 'p1', score: 0, myVote: 0 } },
  optimisticVotePost: vi.fn()
}))

describe('VoteButton', () => {
  it('renders score', () => {
    render(<VoteButton postId="p1" />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
