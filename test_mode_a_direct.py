import asyncio
import json
import traceback

from app.agents.site_graph import audit_site_stream

async def run_test():
    print("Starting backend test for Mode A on ceremonykitchen.com...")
    url = "https://ceremonykitchen.com/"
    
    try:
        # We pass an empty auth header to bypass DB saving
        async for sse_event in audit_site_stream(url, ""):
            # sse_event is like 'event: progress\ndata: {...}\n\n'
            # Let's parse it
            if not sse_event.startswith("event: "):
                continue
                
            parts = sse_event.strip().split("\n")
            if len(parts) >= 2:
                event_type = parts[0].replace("event: ", "")
                data_str = parts[1].replace("data: ", "")
                
                try:
                    data = json.loads(data_str)
                    
                    if event_type == "product_done":
                        name = data.get("name", "Unknown")
                        seo = data.get("seo_score", "N/A")
                        aeo = data.get("aeo_score", "N/A")
                        seo_err = data.get("seo_report", {}).get("error", None)
                        aeo_err = data.get("aeo_report", {}).get("error", None)
                        
                        if seo_err or aeo_err:
                            print(f"\n[FAIL] {name} -> SEO: {seo}, AEO: {aeo}")
                            if seo_err: print(f"       SEO ERROR: {seo_err}")
                            if aeo_err: print(f"       AEO ERROR: {aeo_err}")
                        else:
                            print(f"[SUCCESS] {name} -> SEO Score: {seo}/100, AEO Score: {aeo}/100")
                            
                    elif event_type == "error":
                        print(f"\n[GLOBAL ERROR] {data.get('message')}")
                        
                except json.JSONDecodeError:
                    print("\n[PARSE ERROR] Failed to parse SSE JSON data.")
                    print(data_str[:200])
                    
    except Exception as e:
        print(f"\n[EXCEPTION] {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_test())
