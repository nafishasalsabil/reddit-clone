import admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
// Initialize Firebase Admin for production
// Uses Application Default Credentials (ADC) or service account key
if (!admin.apps || admin.apps.length === 0) {
    try {
        // Try to initialize with default credentials (from gcloud auth application-default login)
        admin.initializeApp({
            projectId: process.env.GCLOUD_PROJECT || 'reddit-clone-app-23ebc'
        });
        console.log('Initialized Firebase Admin with Application Default Credentials');
    }
    catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
        console.error('\nTo fix this, run one of the following:');
        console.error('1. gcloud auth application-default login');
        console.error('2. Or set GOOGLE_APPLICATION_CREDENTIALS to a service account key file');
        process.exit(1);
    }
}
const db = admin.firestore();
const COMMUNITIES = [
    {
        name: 'food',
        title: 'Food',
        description: 'Share your favorite recipes, food photos, and culinary adventures!'
    },
    {
        name: 'games',
        title: 'Games',
        description: 'Discuss video games, board games, and all things gaming!'
    },
    {
        name: 'memes',
        title: 'Memes',
        description: 'The best memes on the internet. Share and enjoy!'
    },
    {
        name: 'movies',
        title: 'Movies',
        description: 'Movie discussions, reviews, and recommendations'
    },
    {
        name: 'music',
        title: 'Music',
        description: 'Share music, discuss artists, and discover new sounds'
    },
    {
        name: 'technology',
        title: 'Technology',
        description: 'Tech news, discussions, and innovations'
    },
    {
        name: 'sports',
        title: 'Sports',
        description: 'All things sports - news, highlights, and discussions'
    },
    {
        name: 'books',
        title: 'Books',
        description: 'Book recommendations, reviews, and literary discussions'
    },
    {
        name: 'travel',
        title: 'Travel',
        description: 'Share your travel experiences and get inspired for your next trip'
    },
    {
        name: 'fitness',
        title: 'Fitness',
        description: 'Fitness tips, workout routines, and health discussions'
    }
];
const POSTS = {
    food: [
        {
            title: 'Homemade pizza recipe that changed my life',
            type: 'text',
            body: 'I\'ve been making pizza for years, but this recipe is absolutely incredible. The secret is in the dough - let it rise for at least 24 hours in the fridge. The flavor development is amazing!\n\nIngredients:\n- 500g bread flour\n- 350ml warm water\n- 10g salt\n- 5g active dry yeast\n\nMix everything together, knead for 10 minutes, then let it rest in the fridge for 24-48 hours. Trust me, it\'s worth the wait!'
        },
        {
            title: 'Check out this amazing pasta dish I made',
            type: 'image',
            imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1f81111?w=800&q=80'
        }
    ],
    games: [
        {
            title: 'What\'s your favorite game of 2024?',
            type: 'text',
            body: 'I\'ve been playing so many great games this year. What are your top picks? I\'m really into indie games right now - they\'re doing some incredible things with storytelling and gameplay mechanics.'
        },
        {
            title: 'New game release: Check out this trailer',
            type: 'link',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        }
    ],
    memes: [
        {
            title: 'When you realize it\'s Monday',
            type: 'image',
            imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4f18cc5?w=800&q=80'
        },
        {
            title: 'This meme is too relatable',
            type: 'text',
            body: 'Me trying to explain to my parents why I need a new gaming setup'
        }
    ],
    movies: [
        {
            title: 'Just watched the new sci-fi movie - mind blown!',
            type: 'image',
            imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80'
        },
        {
            title: 'Classic movie recommendations?',
            type: 'text',
            body: 'Looking to expand my movie knowledge. What are some must-watch classic films? I\'m open to any genre - just want to watch some timeless cinema.'
        }
    ],
    music: [
        {
            title: 'New album dropped and it\'s fire',
            type: 'text',
            body: 'This artist just released their new album and every track is a banger. The production quality is insane and the lyrics hit different. What do you all think?'
        },
        {
            title: 'Best concert you\'ve ever been to?',
            type: 'text',
            body: 'Share your most memorable concert experience! Mine was seeing my favorite band live for the first time - the energy was unreal and I\'ll never forget it.'
        }
    ],
    technology: [
        {
            title: 'New AI developments are changing everything',
            type: 'text',
            body: 'The pace of AI innovation is incredible. What do you think about the latest developments? Are we moving too fast, or is this the future we need?'
        },
        {
            title: 'Building my first PC - need advice',
            type: 'text',
            body: 'Finally decided to build my own PC instead of buying pre-built. Any tips for a first-timer? Budget is around $1500. Mainly for gaming and some video editing.'
        }
    ],
    sports: [
        {
            title: 'What a game last night!',
            type: 'text',
            body: 'That final play was absolutely insane. Can\'t believe they pulled it off. Best game I\'ve watched all season!'
        },
        {
            title: 'Predictions for the upcoming season?',
            type: 'text',
            body: 'Who do you think will take it all this year? I\'m putting my money on the underdogs - they\'ve been looking strong in the preseason.'
        }
    ],
    books: [
        {
            title: 'Just finished this amazing book',
            type: 'text',
            body: 'The character development was incredible and the plot kept me guessing until the very end. Highly recommend to anyone who loves mystery novels with deep psychological elements.'
        },
        {
            title: 'Book club recommendations?',
            type: 'text',
            body: 'Starting a new book club and looking for suggestions. We want something that will generate good discussions. Any genre welcome!'
        }
    ],
    travel: [
        {
            title: 'Just got back from an amazing trip',
            type: 'image',
            imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'
        },
        {
            title: 'Hidden gems in Europe?',
            type: 'text',
            body: 'Planning a trip to Europe and want to visit some less touristy places. Any recommendations for hidden gems that are worth visiting?'
        }
    ],
    fitness: [
        {
            title: 'Hit a new personal record today!',
            type: 'image',
            imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'
        },
        {
            title: 'Best home workout routines?',
            type: 'text',
            body: 'Can\'t make it to the gym as often as I\'d like. What are some effective home workout routines that don\'t require much equipment?'
        }
    ]
};
async function syncCommentCounts() {
    console.log('Syncing comment counts for all posts...');
    try {
        const postsSnapshot = await db.collection('posts').get();
        let synced = 0;
        for (const postDoc of postsSnapshot.docs) {
            const postId = postDoc.id;
            const commentsSnapshot = await db.collection('posts').doc(postId).collection('comments').get();
            const actualCount = commentsSnapshot.size;
            const currentCount = postDoc.data()?.commentCount || 0;
            if (actualCount !== currentCount) {
                await db.collection('posts').doc(postId).update({ commentCount: actualCount });
                console.log(`  Fixed post "${postDoc.data()?.title}": ${currentCount} -> ${actualCount}`);
                synced++;
            }
        }
        console.log(`Synced ${synced} post(s)`);
    }
    catch (error) {
        console.error('Error syncing comment counts:', error);
        throw error;
    }
}
async function seed() {
    console.log('Starting seed...');
    // Create a default user ID for seeding (in production, you'd use a real user)
    const defaultUserId = 'seed-user-12345';
    try {
        // First, sync all existing comment counts
        await syncCommentCounts();
        // Create communities
        const communityIds = {};
        for (const community of COMMUNITIES) {
            console.log(`Creating community: ${community.name}`);
            // Check if community already exists
            const existing = await db.collection('communities')
                .where('name', '==', community.name)
                .limit(1)
                .get();
            if (!existing.empty) {
                console.log(`Community ${community.name} already exists, skipping...`);
                communityIds[community.name] = existing.docs[0].id;
                continue;
            }
            const docRef = await db.collection('communities').add({
                name: community.name,
                title: community.title,
                description: community.description,
                createdBy: defaultUserId,
                createdAt: Timestamp.now(),
                memberCount: 1,
                modUids: [defaultUserId]
            });
            communityIds[community.name] = docRef.id;
            console.log(`Created community: ${community.name} (${docRef.id})`);
        }
        // Create posts for each community
        for (const [communityName, posts] of Object.entries(POSTS)) {
            const communityId = communityIds[communityName];
            if (!communityId) {
                console.warn(`Community ${communityName} not found, skipping posts...`);
                continue;
            }
            console.log(`Creating posts for community: ${communityName}`);
            for (const post of posts) {
                // Check if post already exists
                const existing = await db.collection('posts')
                    .where('cid', '==', communityId)
                    .where('title', '==', post.title)
                    .limit(1)
                    .get();
                let postId;
                let isNewPost = false;
                if (!existing.empty) {
                    // Post already exists
                    const existingPost = existing.docs[0];
                    postId = existingPost.id;
                    const existingData = existingPost.data();
                    const needsUpdate = (post.type === 'image' && post.imageUrl && !existingData.imageUrl) ||
                        (post.type === 'text' && post.body && !existingData.body) ||
                        (post.type === 'link' && post.url && !existingData.url);
                    if (needsUpdate) {
                        const updateData = {
                            type: post.type
                        };
                        if (post.type === 'image' && post.imageUrl) {
                            updateData.imageUrl = post.imageUrl;
                        }
                        else if (post.type === 'text' && post.body) {
                            updateData.body = post.body;
                        }
                        else if (post.type === 'link' && post.url) {
                            updateData.url = post.url;
                        }
                        await db.collection('posts').doc(existingPost.id).update(updateData);
                        console.log(`Updated post: "${post.title}"`);
                    }
                    else {
                        console.log(`Post "${post.title}" already exists`);
                    }
                    // Check if comments already exist
                    const existingComments = await db.collection('posts').doc(postId).collection('comments').limit(1).get();
                    if (!existingComments.empty) {
                        console.log(`  Post "${post.title}" already has comments, skipping comment creation`);
                        continue;
                    }
                }
                else {
                    // Create new post
                    const postData = {
                        cid: communityId,
                        authorUid: defaultUserId,
                        title: post.title,
                        type: post.type,
                        score: Math.floor(Math.random() * 100) + 1, // Random score between 1-100
                        hotRank: 0,
                        commentCount: 0, // Will be updated after comments are created
                        createdAt: Timestamp.now(),
                        editedAt: null
                    };
                    if (post.type === 'text' && post.body) {
                        postData.body = post.body;
                    }
                    else if (post.type === 'link' && post.url) {
                        postData.url = post.url;
                    }
                    else if (post.type === 'image' && post.imageUrl) {
                        postData.imageUrl = post.imageUrl;
                    }
                    const postRef = await db.collection('posts').add(postData);
                    postId = postRef.id;
                    isNewPost = true;
                    console.log(`Created post: "${post.title}" (${postId})`);
                }
                // Add dummy comments to the post (for both new and existing posts without comments)
                const commentCount = Math.floor(Math.random() * 15) + 3; // 3-17 comments per post
                const dummyComments = [
                    'Great post! Thanks for sharing.',
                    'I totally agree with this.',
                    'This is really helpful, thanks!',
                    'Interesting perspective. I hadn\'t thought about it that way.',
                    'Can you elaborate on this point?',
                    'This reminds me of something similar I experienced.',
                    'Thanks for the detailed explanation!',
                    'I have a different opinion on this, but I respect your view.',
                    'This is exactly what I needed to hear today.',
                    'Has anyone else tried this? I\'d love to hear more experiences.',
                    'Great content! Keep it up.',
                    'I\'m saving this for later reference.',
                    'This is so relatable!',
                    'Could you provide more details about this?',
                    'I disagree, but I appreciate the discussion.',
                    'This is really well written. Thanks!',
                    'I\'ve been looking for something like this.',
                    'This is helpful, but I think there\'s more to consider.',
                    'Great insights! This changes my perspective.',
                    'I\'m curious to hear what others think about this.'
                ];
                // Shuffle and pick random comments
                const shuffled = [...dummyComments].sort(() => Math.random() - 0.5);
                const selectedComments = shuffled.slice(0, commentCount);
                // Create comments and count how many were actually created
                let actualCommentCount = 0;
                for (let i = 0; i < selectedComments.length; i++) {
                    try {
                        const commentBody = selectedComments[i];
                        const commentScore = Math.floor(Math.random() * 50) - 10; // Random score between -10 and 40
                        await db.collection('posts').doc(postId).collection('comments').add({
                            authorUid: defaultUserId,
                            body: commentBody,
                            score: commentScore,
                            path: `${Date.now()}_${i}`, // Simple path for flat comments
                            createdAt: Timestamp.fromMillis(Timestamp.now().toMillis() - (selectedComments.length - i) * 60000), // Stagger timestamps
                            editedAt: null
                        });
                        actualCommentCount++;
                    }
                    catch (error) {
                        console.error(`  Failed to create comment ${i + 1} for post "${post.title}":`, error);
                    }
                }
                // Count actual comments in the database to ensure accuracy
                const commentsSnapshot = await db.collection('posts').doc(postId).collection('comments').get();
                const realCommentCount = commentsSnapshot.size;
                // Update post commentCount to match actual number of comments
                await db.collection('posts').doc(postId).update({
                    commentCount: realCommentCount
                });
                console.log(`  Added ${actualCommentCount} comments to post "${post.title}" (total: ${realCommentCount})`);
            }
        }
        console.log('Seed completed successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}
// Run seed
seed().catch(console.error);
