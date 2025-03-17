from youtube_transcript_api import YouTubeTranscriptApi

def test_transcript_api():
    video_id = 'IitIl2C3Iy8'  # TED Talk
    
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        print(f"Found transcripts for video {video_id}:")
        
        for transcript in transcript_list:
            print(f"  - {transcript.language_code}: {transcript.language}")
            
        # Try to get English transcript
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        print(f"Got transcript with {len(transcript)} entries")
        print(f"First few entries: {transcript[:3]}")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_transcript_api()