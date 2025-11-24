import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import CommentThread from '@/components/CommentThread'

describe('CommentThread', () => {
  it('renders comments', () => {
    render(<CommentThread comments={[{ id: 'c1', authorUid: 'u1', body: 'Hi' }]} />)
    expect(screen.getByText(/Hi/)).toBeInTheDocument()
  })
})
