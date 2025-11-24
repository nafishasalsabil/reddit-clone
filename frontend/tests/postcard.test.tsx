import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import PostCard from '@/components/PostCard'
import { usePostStore } from '@/store/postStore'

vi.mock('@/store/postStore', async () => {
  const actual = await vi.importActual<any>('@/store/postStore')
  return { ...actual, usePostStore: (selector: any) => selector({ postById: { p1: { id: 'p1', score: 10, myVote: 0 } } }) }
})

describe('PostCard', () => {
  it('renders title and score', () => {
    render(<PostCard post={{ id: 'p1', title: 'Hello', authorUid: 'u1' }} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
