# Election Algorithms & Distributed Processing


A **Distributed Algorithm** is an algorithm that runs on a distributed system—a collection of independent computers that do not share their memory. Each processor has its own memory, and they communicate via communication networks. Communication in networks is implemented by a process on one machine communicating with a process on another machine. Many algorithms used in distributed systems require a **Coordinator** that performs essential functions needed by other processes.

Election algorithms are designed explicitly to choose this Coordinator.

---

## What is an Election Algorithm?

Election algorithms choose a process from a group of processors to act as a coordinator. If the current coordinator process crashes due to any reason, a new coordinator must be elected on another processor. Essentially, an election algorithm determines where a new copy of the coordinator should be restarted. 

### Key Assumptions:
- Every active process in the system has a **unique priority number** (often its Process ID).
- The process with the **highest priority number** will always be chosen as the new coordinator.
- When an active process discovers a coordinator has failed, it initiates an election to find the active process with the highest priority number.
- Once elected, the new coordinator's ID is sent to every active process in the distributed system.

There are two primary election algorithms based on different configurations of a distributed system:

---

## 1. The Bully Algorithm

This algorithm applies to systems where **every process can send a message to every other process** in the system (a fully connected network).

### Algorithm Steps:
Suppose process **P** sends a message to the coordinator.
1. **Detect Failure:** If the coordinator does not respond within a time interval `T`, **P** assumes the coordinator has failed.
2. **Start Election:** Process **P** sends an **ELECTION** message to *every* process with a priority number higher than its own.
3. **Wait for Responses:** 
   - If *no one responds* for the time interval `T`, process **P** wins and elects itself as the new coordinator. It then broadcasts a **COORDINATOR** message to all lower-priority processes.
   - If an answer (an **OK** message) is received within time `T` from any higher-priority process **Q**:
     1. Process **P** waits again for a time interval `T'` to receive another message from **Q** stating that **Q** has been elected as the new coordinator.
     2. If **Q** does not respond within the time interval `T'`, **P** assumes **Q** has failed, and the algorithm is restarted from step 1.

---

## 2. The Ring Algorithm

This algorithm applies to systems organized as a logical or physical **Ring**. We assume that the links between processes are **unidirectional**, meaning every process can only send messages to the process directly on its right. 

**Data Structure:** The algorithm uses an **Active List**, which contains the priority numbers of all active processes currently participating in the election in the system.

### Algorithm Steps:
Suppose process **P1** detects a coordinator failure.
1. **Initiate Election:** **P1** creates a new, initially empty *Active List*. It adds its own process priority number (e.g., `1`) to the list and sends an **ELECTION** message containing this list to its right neighbor.
2. **Handle Incoming Messages:** If a process (e.g., **P2**) receives an **ELECTION** message from its left neighbor, it handles it in three distinct ways:
   - **(I) Add to List & Forward:** If the received Active List does *not* contain **P2**'s own priority number, **P2** appends its number (e.g., `2`) to the Active List and forwards the ELECTION message to the right.
   - **(II) Concurrent Initiation:** If this is the *first* ELECTION message **P2** has received or sent (meaning it also independently detected the crash), it creates its own Active List with both its number and the numbers from the received message, then forwards the merged ELECTION message.
   - **(III) Election Conclusion:** If process **P1** receives an ELECTION message that contains its *own* priority number at the start, it means the message has circulated the entire ring. The Active List now contains the numbers of *all* active processes in the system. Process **P1** scans the list, identifies the **highest priority number**, and elects that process as the new coordinator. It then sends out a new **COORDINATOR** message around the ring to inform everyone of the winner.
